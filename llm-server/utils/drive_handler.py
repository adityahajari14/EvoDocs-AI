import sys
import json
import base64
from drive_utils import get_google_drive_service, upload_file

def handle_drive_upload():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        file_name = input_data.get('fileName')
        folder_name = input_data.get('folderName')
        file_content = base64.b64decode(input_data.get('fileContent'))
        
        if not all([file_name, folder_name, file_content]):
            raise ValueError("Missing required parameters")

        # Get Drive service
        service = get_google_drive_service()
        
        # Upload file
        result = upload_file(service, file_name, file_content, folder_name)
        
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

if __name__ == "__main__":
    handle_drive_upload()
