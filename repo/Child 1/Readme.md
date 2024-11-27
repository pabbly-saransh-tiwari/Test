# Cloudflare Worker - File Upload (`multipart/form-data`)

This Cloudflare Worker handles POST requests, fetches files from URLs, and forwards them to an endpoint using `multipart/form-data`.

---

## Prerequisites

1. **Cloudflare Account**  
2. Access to the Cloudflare dashboard.


---

## Setup

1. **Log in to Cloudflare**  
   Go to [Cloudflare Dashboard](https://dash.cloudflare.com/).

2. **Create a New Worker**  
   - Navigate to the **Workers** section.
   - Click **Create a Service** and give your Worker a name.

3. **Add Your Worker Code**  
   - Open the **Worker editor**.
   - Paste the `index.js` code into the editor.
   - Save the changes.

4. **Deploy the Worker**  
   - Assign a route or use the default Worker URL to test.

---

## Usage

Send a POST request to your Worker URL with the following JSON structure:

### Required Fields:
- **`pabbly_api_key`**: API key to authenticate.
- **`file_url`**: URL of the file to fetch.
- **`endpoint`**: Target endpoint for the upload.

### Optional Fields:
- **`method`**: HTTP method for the forwarded request (default: `POST`).
- **`headers_to_forward`**: Headers to include in the forwarded request.
- **`body`**: Additional form data parameters.

### Example Request:

```bash
curl --location 'https://multipartformdata-fileupload.pabbly.workers.dev/' \
--header 'pabbly_api_key: <pabbly-api-key>' \
--header 'Content-Type: application/json' \
--header 'Authorization: <your-api-key>' \
--data '{
    "endpoint": "https://api.example.com/upload",
    "file_url": "https://example.com/sample.png",
    "headers_to_forward": "authorization",
    "method": "POST",
    "file_key": "<file_key_name>",
    "body": {
           "key": "value"
        }
}'