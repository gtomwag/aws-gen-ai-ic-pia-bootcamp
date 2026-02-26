"""
AWS Translate utilities
"""
import boto3
from config import AWS_REGION

translate_client = boto3.client('translate', region_name=AWS_REGION)


def translate_text(text: str, source_language: str, target_language: str) -> dict:
    """
    Translate text using AWS Translate
    """
    print(f"[TRANSLATE] {source_language} -> {target_language}: {text[:50]}...")
    
    try:
        response = translate_client.translate_text(
            Text=text,
            SourceLanguageCode=source_language if source_language != 'auto' else 'auto',
            TargetLanguageCode=target_language
        )
        
        translated = response.get('TranslatedText', text)
        detected_source = response.get('SourceLanguageCode', source_language)
        
        print(f"[TRANSLATE] Result: {translated[:50]}...")
        
        return {
            'translated_text': translated,
            'source_language': detected_source,
            'target_language': target_language
        }
    
    except Exception as e:
        print(f"[TRANSLATE ERROR] {e}")
        raise
