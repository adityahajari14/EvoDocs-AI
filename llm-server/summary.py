import sys
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def generate_summary(text, prompt=None):
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

        # Base system prompt for summarization
        system_prompt = """
        As an analytical assistant, summarize the provided content by:
        - Identifying key information and main points
        - Using clear, professional language
        - Organizing information logically
        - Including relevant technical details
        - Maintaining objectivity
        """

        # Combine prompts based on what's available
        if prompt and prompt.strip():
            prompt_text = f"{system_prompt}\n\nUser Instructions: {prompt}\nContent to analyze: {text}"
        else:
            prompt_text = f"{system_prompt}\n\nContent to analyze: {text}"

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
        prompt = sys.argv[1] if len(sys.argv) > 1 else None
        
        result = generate_summary(input_text, prompt)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
