import os
import pdfplumber
from PIL import Image
import torch
from transformers import VisionEncoderDecoderModel, TrOCRProcessor


class DocumentExtractor:
    """
    Handles extraction from:
    1. Text-based PDFs
    2. Image-based notes (handwritten / scanned)
    """

    def __init__(self):
        self.ocr_model = None
        self.ocr_processor = None

    # ---------------------------------------------------
    # TEXT PDF EXTRACTION
    # ---------------------------------------------------
    def extract_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text directly from text-based PDF
        """
        collected_text = []

        with pdfplumber.open(pdf_path) as pdf:
            for page_number, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    collected_text.append(page_text)

        return "\n".join(collected_text)

    # ---------------------------------------------------
    # OCR INITIALIZATION (Lazy Loading)
    # ---------------------------------------------------
    def _load_ocr_model(self):
        """
        Loads TrOCR model only when required.
        Prevents unnecessary GPU memory usage.
        """
        if self.ocr_model is None:
            self.ocr_processor = TrOCRProcessor.from_pretrained(
                "microsoft/trocr-base-handwritten"
            )
            self.ocr_model = VisionEncoderDecoderModel.from_pretrained(
                "microsoft/trocr-base-handwritten"
            )

    # ---------------------------------------------------
    # IMAGE OCR EXTRACTION
    # ---------------------------------------------------
    def extract_from_image(self, image_path: str) -> str:
        """
        Extract text from handwritten/scanned image
        """
        self._load_ocr_model()

        image = Image.open(image_path).convert("RGB")
        pixel_values = self.ocr_processor(
            image, return_tensors="pt"
        ).pixel_values

        with torch.no_grad():
            generated_ids = self.ocr_model.generate(pixel_values)

        extracted_text = self.ocr_processor.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]

        return extracted_text

    # ---------------------------------------------------
    # SMART ROUTER
    # ---------------------------------------------------
    def extract(self, file_path: str) -> str:
        """
        Auto-detect file type and route accordingly.
        """

        extension = os.path.splitext(file_path)[1].lower()

        if extension == ".pdf":
            # First attempt direct extraction
            text = self.extract_from_pdf(file_path)

            # If text is too small → assume scanned PDF
            if len(text.strip()) < 50:
                print("Detected scanned PDF. Switching to OCR...")
                return self.extract_from_image(file_path)

            return text

        elif extension in [".png", ".jpg", ".jpeg"]:
            return self.extract_from_image(file_path)

        else:
            raise ValueError("Unsupported file format.")