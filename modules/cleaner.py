import re
import nltk
from nltk.tokenize import sent_tokenize


class TextCleaner:
    """
    Cleans raw extracted document text and prepares it
    for semantic chunking and embedding stages.
    """

    def __init__(self):
        pass

    # -----------------------------------------------------
    # 1️⃣ Structural Normalization
    # -----------------------------------------------------
    def normalize(self, text: str) -> str:
        """
        Performs controlled cleaning without destroying meaning.
        We avoid aggressive preprocessing because semantic
        embedding models need natural language intact.
        """

        # Remove multiple newlines
        text = re.sub(r"\n{2,}", "\n", text)

        # Remove unwanted unicode symbols
        text = re.sub(r"[^\x00-\x7F]+", " ", text)

        # Remove page numbering patterns
        text = re.sub(r"\bPage\s*\d+\b", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\b\d+\s*/\s*\d+\b", "", text)

        # Remove excessive spaces
        text = re.sub(r"\s{2,}", " ", text)

        return text.strip()

    # -----------------------------------------------------
    # 2️⃣ Sentence Segmentation
    # -----------------------------------------------------
    def segment(self, text: str) -> list:
        """
        Splits normalized text into meaningful sentences.
        Filters out extremely short fragments.
        """

        sentences = sent_tokenize(text)

        refined_sentences = []

        for sentence in sentences:
            sentence = sentence.strip()

            # Ignore tiny fragments (often OCR noise)
            if len(sentence) > 25:
                refined_sentences.append(sentence)

        return refined_sentences

    # -----------------------------------------------------
    # 3️⃣ Full Cleaning Pipeline
    # -----------------------------------------------------
    def process(self, raw_text: str) -> list:
        """
        Complete cleaning workflow.
        Returns list of cleaned sentences.
        """

        normalized_text = self.normalize(raw_text)
        sentence_list = self.segment(normalized_text)

        return sentence_list