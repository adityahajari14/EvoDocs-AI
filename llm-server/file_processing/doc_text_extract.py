from spire.doc import *
from spire.doc.common import *

def extract_text_from_docx(doc_path):
    document = Document()

    document.LoadFromFile(doc_path)
    document_text = document.GetText()

    return document_text
