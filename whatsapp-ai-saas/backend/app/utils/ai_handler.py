import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY", "")

def get_ai_response(user_message: str, faqs_dict: dict = None) -> str:
    try:
        msg = user_message.lower()
        
        # If dashboard FAQs are present, look for direct keyword match
        if faqs_dict:
            for q_id, ans in faqs_dict.items():
                # Extract keyword or check if key terms match
                if "fee" in msg or "price" in msg or "cost" in msg or "month" in msg:
                    if q_id == "q2": # Monthly membership
                        return ans
                if "timing" in msg or "time" in msg or "open" in msg:
                    if q_id == "q1": # Timings
                        return ans
                if "trial" in msg:
                    if q_id == "q3": # Trial
                        return ans
            
            # If any specific FAQ answer matches content words
            for q_id, ans in faqs_dict.items():
                return f"💡 {ans}"

        # Smart fallback responses based on keywords
        if "timing" in msg or "time" in msg or "open" in msg:
            return "🏋️ Iron Fitness Gym timings are 6:00 AM to 10:00 PM daily!"
        elif "fee" in msg or "price" in msg or "cost" in msg or "month" in msg:
            return "💪 Monthly membership is ₹1500 and Quarterly is ₹3800."
        elif "trial" in msg:
            return "🔥 Yes! We offer a 7-day free trial for new members."
        else:
            return f"Hello! Thanks for contacting Iron Fitness Gym. Regarding '{user_message}', please call our manager for details."
            
    except Exception as e:
        return "Hello! Thank you for reaching out to Iron Fitness Gym. How can we help you today?"
