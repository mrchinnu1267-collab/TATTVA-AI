import re

class TattvaPromptEnhancer:
    """Cleans and optimizes complex prompts without imposing rigid artistic styles."""

    def __init__(self):
        self.negative_prompt = (
            "blurry, low quality, bad anatomy, malformed hands, extra limbs, "
            "distorted face, watermark, text, signature, duplicate artifacts"
        )

    def enhance(self, prompt: str, style: str = "") -> dict:
        prompt = re.sub(r"\s+", " ", prompt).strip()

        if not prompt:
            raise ValueError("Prompt cannot be empty.")

        # Respect the user's natural language and complex prompt without forcing rigid style tags
        return {
            "original_prompt": prompt,
            "enhanced_prompt": prompt,
            "negative_prompt": self.negative_prompt,
            "style": "",
        }


if __name__ == "__main__":
    enhancer = TattvaPromptEnhancer()
    result = enhancer.enhance("A serene meditating monk beside an alpine river at dusk")
    print("Enhanced:", result["enhanced_prompt"])