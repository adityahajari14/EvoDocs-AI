import sys
import json
import tempfile
import os
import base64
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables at the start
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def process_file(file_name, file_content, user_prompt):
    try:
        if "GEMINI_API_KEY" not in os.environ:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])

        generation_config = {
            "temperature": 1,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }

        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=generation_config
        )

        prompt_text = """
        Analyze this document and classify it into EXACTLY ONE of these categories:
        1. HR_Documents
        2. Administrative
        3. Financial_Records
        4. Legal_Documents
        5. Sales_Marketing
        6. Technical_Docs
        7. Miscellaneous

        Return your response in this format exactly:
        Folder: <category_name>
        Summary: <your detailed analysis>
        
        Document content (Base64 encoded):
        """

        prompt_text += base64.b64encode(file_content).decode('utf-8')
        if user_prompt:
            prompt_text += f"\n\nAdditional context: {user_prompt}"

        response = model.generate_content(prompt_text)
        
        try:
            response_text = response.text
            # Parse the formatted response
            lines = response_text.strip().split('\n')
            folder = lines[0].replace('Folder:', '').strip()
            summary = '\n'.join(lines[1:]).replace('Summary:', '', 1).strip()
            
            return {
                "success": True,
                "category": folder,
                "summary": summary
            }
        except Exception:
            return {
                "success": True,
                "category": "Miscellaneous",
                "summary": response_text
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Processing error: {str(e)}"
        }

def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("File name argument is required")

        file_name = sys.argv[1]
        user_prompt = sys.argv[2] if len(sys.argv) > 2 else ""

        # Read file content from stdin
        file_content = sys.stdin.buffer.read()

        # Process the file
        result = process_file(file_name, file_content, user_prompt)

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()