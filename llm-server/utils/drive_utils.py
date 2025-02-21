from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
import os
import pickle

SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_google_drive_service():
    creds = None
    token_path = os.path.join(os.path.dirname(__file__), '../token.pickle')
    credentials_path = os.path.join(os.path.dirname(__file__), '../credentials.json')

    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path, 
                SCOPES
            )
            try:
                creds = flow.run_local_server(
                    host='localhost',
                    port=3000,
                    access_type='offline',
                    prompt='consent',
                    state='test_mode',  # Add state parameter for testing
                    include_granted_scopes='true',
                    authorization_prompt_message='Please authorize access using your test account',
                    success_message='Authentication successful! You can close this window.'
                )
            except Exception as e:
                if 'access_denied' in str(e):
                    print("Authentication failed. Make sure you're using a test account.")
                    print("Test accounts must be added in Google Cloud Console.")
                    raise Exception("Authentication failed - Use test account")
                raise e

        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)

    return build('drive', 'v3', credentials=creds)

def upload_file(service, file_name, file_content, folder_name):
    try:
        # First check if root folder exists
        root_folder_id = None
        try:
            from ..config.drive_config import DRIVE_FOLDERS
            root_folder_id = DRIVE_FOLDERS.get('root_folder_id')
        except ImportError:
            print("Warning: drive_config.py not found, using default folder structure")

        # Search for category folder under root
        folder_query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}'"
        if root_folder_id:
            folder_query += f" and '{root_folder_id}' in parents"
        folder_query += " and trashed=false"
        
        results = service.files().list(q=folder_query).execute()
        folders = results.get('files', [])

        # Create folder if it doesn't exist
        if not folders:
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [root_folder_id] if root_folder_id else None
            }
            folder = service.files().create(body=folder_metadata, fields='id').execute()
            folder_id = folder.get('id')
            print(f"Created new folder '{folder_name}' with ID: {folder_id}")
        else:
            folder_id = folders[0]['id']
            print(f"Using existing folder '{folder_name}' with ID: {folder_id}")

        # Prepare file metadata
        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }

        # Create file stream and upload
        file_stream = io.BytesIO(file_content)
        media = MediaIoBaseUpload(file_stream, 
                                mimetype='application/octet-stream',
                                resumable=True)

        file = service.files().create(body=file_metadata,
                                    media_body=media,
                                    fields='id').execute()
        
        file_id = file.get('id')
        file_url = f"https://drive.google.com/file/d/{file_id}/view"
        folder_url = f"https://drive.google.com/drive/folders/{folder_id}"
        
        print(f"Uploaded file '{file_name}' to folder '{folder_name}'")
        print(f"File URL: {file_url}")
        print(f"Folder URL: {folder_url}")
        
        return {
            'success': True,
            'fileId': file_id,
            'folderId': folder_id,
            'fileUrl': file_url,
            'folderUrl': folder_url
        }

    except Exception as e:
        print(f"Drive upload error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
