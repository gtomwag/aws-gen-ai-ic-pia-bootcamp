"""
AWS Comprehend utilities for sentiment analysis
"""
import boto3
from config import AWS_REGION

comprehend = boto3.client('comprehend', region_name=AWS_REGION)


def analyze_sentiment(text: str) -> dict:
    """
    Analyze sentiment of text using AWS Comprehend
    """
    print(f"[COMPREHEND] Analyzing sentiment: {text[:50]}...")
    
    try:
        response = comprehend.detect_sentiment(
            Text=text,
            LanguageCode='en'
        )
        
        sentiment = response.get('Sentiment', 'NEUTRAL')
        scores = response.get('SentimentScore', {})
        
        print(f"[COMPREHEND] Sentiment: {sentiment}")
        
        return {
            'sentiment': sentiment,
            'scores': {
                'positive': scores.get('Positive', 0),
                'negative': scores.get('Negative', 0),
                'neutral': scores.get('Neutral', 0),
                'mixed': scores.get('Mixed', 0)
            }
        }
    
    except Exception as e:
        print(f"[COMPREHEND ERROR] {e}")
        raise
