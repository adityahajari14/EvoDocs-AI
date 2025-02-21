import sys
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def generate_summary(text, prompt):
    try:
        if "GEMINI_API_KEY" not in os.environ:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        
        generation_config = {
            "temperature": 0.7,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 2048,
        }

        model = genai.GenerativeModel(
            model_name="gemini-1.0-pro",
            generation_config=generation_config
        )

        prompt_text = f"Please provide a concise summary of the following analysis. Focus on the key points and main takeaways: {text}"
        if prompt:
            prompt_text += f"\nAdditional instructions: {prompt}"

        response = model.generate_content(prompt_text)
        
        return {
            "success": True,
            "summary": response.text
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    try:
        input_text = sys.stdin.read()
        prompt = sys.argv[1] if len(sys.argv) > 1 else ""
        
        result = generate_summary(input_text, prompt)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
