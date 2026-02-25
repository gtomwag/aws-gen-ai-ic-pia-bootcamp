#!/usr/bin/env python3
"""Upload web/ files to the S3 website bucket created by SAM.

Usage:
    python upload-web.py                          # auto-detect from stack
    python upload-web.py --bucket BUCKET_NAME     # explicit bucket
"""

import argparse
import json
import mimetypes
import os
import subprocess
import sys

import boto3
from botocore.exceptions import ClientError

STACK_NAME = os.environ.get("SAM_STACK_NAME", "genai-disruption-poc")
REGION = os.environ.get("AWS_REGION", "us-east-1")
WEB_DIR = os.path.join(os.path.dirname(__file__), "..", "web")

CONTENT_TYPES = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def get_stack_output(stack_name, region, key):
    """Fetch a CloudFormation stack output value."""
    cf = boto3.client("cloudformation", region_name=region)
    resp = cf.describe_stacks(StackName=stack_name)
    for output in resp["Stacks"][0].get("Outputs", []):
        if output["OutputKey"] == key:
            return output["OutputValue"]
    return None


def get_api_url(stack_name, region):
    url = get_stack_output(stack_name, region, "ApiUrl")
    if url:
        return url.rstrip("/")
    return None


def patch_api_base_url(file_content, api_url):
    """Replace API_BASE_URL in app.js with the deployed API Gateway URL."""
    return file_content.replace(
        "http://127.0.0.1:3000", api_url
    ).replace(
        "https://njbbl68078.execute-api.us-east-1.amazonaws.com/Prod", api_url
    )


def upload_web(bucket_name, region, api_url=None):
    s3 = boto3.client("s3", region_name=region)
    web_dir = os.path.abspath(WEB_DIR)

    if not os.path.isdir(web_dir):
        print(f"ERROR: web directory not found at {web_dir}")
        sys.exit(1)

    count = 0
    for root, _dirs, files in os.walk(web_dir):
        for fname in files:
            fpath = os.path.join(root, fname)
            key = os.path.relpath(fpath, web_dir).replace("\\", "/")
            ext = os.path.splitext(fname)[1].lower()
            content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

            # Read file content
            if ext in (".html", ".js", ".css", ".json", ".svg"):
                with open(fpath, "r", encoding="utf-8") as f:
                    body = f.read()
                # Patch API URL in app.js
                if fname == "app.js" and api_url:
                    body = patch_api_base_url(body, api_url)
                body_bytes = body.encode("utf-8")
            else:
                with open(fpath, "rb") as f:
                    body_bytes = f.read()

            print(f"  Uploading {key}  ({content_type})")
            s3.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=body_bytes,
                ContentType=content_type,
            )
            count += 1

    print(f"\n  {count} file(s) uploaded to s3://{bucket_name}/")


def main():
    parser = argparse.ArgumentParser(description="Upload web UI to S3")
    parser.add_argument("--bucket", help="S3 bucket name (auto-detected if omitted)")
    parser.add_argument("--stack", default=STACK_NAME, help="CloudFormation stack name")
    parser.add_argument("--region", default=REGION, help="AWS region")
    args = parser.parse_args()

    bucket = args.bucket
    if not bucket:
        print(f"Looking up bucket from stack '{args.stack}' in {args.region} ...")
        bucket = get_stack_output(args.stack, args.region, "WebBucketName")
        if not bucket:
            print("ERROR: Could not find WebBucketName output. Did the stack deploy?")
            sys.exit(1)

    api_url = get_api_url(args.stack, args.region)
    print(f"API URL: {api_url}")
    print(f"Bucket:  {bucket}")
    print()

    upload_web(bucket, args.region, api_url)

    website_url = get_stack_output(args.stack, args.region, "WebsiteUrl")
    if website_url:
        print(f"\n  Website live at: {website_url}")


if __name__ == "__main__":
    main()
