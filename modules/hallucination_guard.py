import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


class HallucinationGuard:
    """
    Verifies whether generated answers are
    semantically grounded in source context.
    """

    def __init__(self, model_name="all-mpnet-base-v2", threshold=0.60):
        self.embedder = SentenceTransformer(model_name)
        self.threshold = threshold

    # ---------------------------------------------------
    # Extract answer lines
    # ---------------------------------------------------
    def extract_answers(self, generated_text):
        """
        Extracts lines containing 'Correct Answer'
        """
        answers = []

        lines = generated_text.split("\n")
        for line in lines:
            if "Correct Answer" in line:
                answers.append(line.strip())

        return answers

    # ---------------------------------------------------
    # Verify answers against context
    # ---------------------------------------------------
    def verify(self, generated_text, context):

        answers = self.extract_answers(generated_text)

        if not answers:
            return False, "No answers detected."

        context_embedding = self.embedder.encode(
            [context], convert_to_numpy=True
        )

        valid_count = 0

        for answer in answers:

            answer_embedding = self.embedder.encode(
                [answer], convert_to_numpy=True
            )

            similarity = cosine_similarity(
                context_embedding,
                answer_embedding
            )[0][0]

            if similarity >= self.threshold:
                valid_count += 1

        confidence = valid_count / len(answers)

        # Accept only if majority answers are grounded
        if confidence >= 0.6:
            return True, confidence
        else:
            return False, confidence