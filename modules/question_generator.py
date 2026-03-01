import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


class RAGQuestionGenerator:
    """
    Generates MCQs strictly grounded on retrieved context.
    Uses FLAN-T5 for controlled generation.
    """

    def __init__(self, model_name="google/flan-t5-large"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

    # ---------------------------------------------------
    # Prompt Builder
    # ---------------------------------------------------
    def build_prompt(self, context):
        """
        Structured instruction to reduce hallucination.
        """

        prompt = f"""
You are an academic question generator.

Generate exactly 5 multiple choice questions (MCQs)
strictly based on the context below.

Rules:
- Do NOT use outside knowledge.
- Each question must have 4 options.
- Mark the correct answer clearly.
- Avoid repeating questions.

Context:
{context}
"""
        return prompt

    # ---------------------------------------------------
    # Generate Questions
    # ---------------------------------------------------
    def generate(self, context, max_tokens=512):

        prompt = self.build_prompt(context)

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=1024
        )

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=0.7,
                top_p=0.9,
                do_sample=True
            )

        generated_text = self.tokenizer.decode(
            outputs[0],
            skip_special_tokens=True
        )

        return generated_text