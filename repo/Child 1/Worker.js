addEventListener('fetch', env , event => {
    // Attach the main handler function to incoming fetch events
    event.respondWith(handleRequest(event.request));
  });
  
  async function handleRequest(request) {
    // Check if the request method is POST; otherwise, return a 405 status
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
  

//////////////////////////////////////////////////New Comment From VS Code///////////////////////////////////////////////////////////

    const CHECK_API_KEY = env.pabbly_api_key; // Hardcoded API key for authentication
    const requestHeaders = request.headers;
    const incomingApiKey = requestHeaders.get('pabbly_api_key');
    let fileExtension = null;
  
    // Validate the API key; return a 401 Unauthorized response if invalid
    if (incomingApiKey !== CHECK_API_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }
  
    let requestBody;
    try {
      // Attempt to parse the request body as JSON
      const requestText = await request.text();
      requestBody = JSON.parse(requestText);
    } catch (e) {
      // Return a 400 status if the body is not valid JSON
      return new Response('Invalid JSON body', { status: 400 });
    }
  
    const {
      file_url, // URL of the file to be uploaded
      endpoint, // Target endpoint for the upload
      method = 'POST', // HTTP method for the request
      headers_to_forward, // Headers to forward to the endpoint
      body: body_params, // Additional form-data parameters
      file_key = 'file', // Key name for the uploaded file in form-data
    } = requestBody;
  
    // Ensure the file_url and endpoint are provided in the request body
    if (!file_url || !endpoint) {
      return new Response('Missing required fields in request body', { status: 400 });
    }
  
    // Append query parameters from the original request to the endpoint URL
    const requestUrl = new URL(request.url);
    const endpointUrl = new URL(endpoint);
    for (const [key, value] of requestUrl.searchParams.entries()) {
      endpointUrl.searchParams.append(key, value);
    }
  
    try {
      // Fetch the file from the given file_url
      const fileResponse = await fetch(file_url);
      if (!fileResponse.ok) {
        return new Response('Failed to fetch the file', { status: 500 });
      }
  
      // Map of common MIME types to file extensions
      const mimeTypes = {
        'text/plain': 'txt',
        'text/csv': 'csv',
        'application/rtf': 'rtf',
        'text/html': 'html',
        'text/css': 'css',
        'application/javascript': 'js',
        'application/json': 'json',
        'application/xml': 'xml',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/bmp': 'bmp',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/tiff': 'tiff',
        'image/x-icon': 'ico',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/zip': 'zip',
        'application/octet-stream': 'bin'
      };
  
      // Determine the content type of the file
      let contentType = fileResponse.headers.get('Content-Type');
      if (contentType) {
        contentType = contentType.split(';')[0].trim();
      }
  
      // Handle cases where the content type is unknown or binary
      if (
        !contentType ||
        contentType === 'application/octet-stream' ||
        contentType === 'application/binary'
      ) {
        const contentDisposition = fileResponse.headers.get('Content-Disposition');
  
        // Try to extract the filename and extension from the Content-Disposition header
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i
          );
          if (filenameMatch && filenameMatch[1]) {
            let filename = filenameMatch[1].replace(/['"]/g, '');
            fileExtension = filename.split('.').pop().toLowerCase();
          }
        }
  
        // Fallback to extracting the extension from the URL
        if (!fileExtension) {
          const urlObj = new URL(file_url);
          const urlPath = urlObj.pathname;
          fileExtension = urlPath.split('.').pop().toLowerCase();
  
          // Check specific query parameters for potential file extensions
          if (!fileExtension || fileExtension === urlPath.toLowerCase()) {
            fileExtension = '';
            const possibleParams = ['exportFormat', 'format', 'ext'];
            for (const param of possibleParams) {
              if (urlObj.searchParams.has(param)) {
                fileExtension = urlObj.searchParams.get(param).toLowerCase();
                break;
              }
            }
          }
        }
      } else {
        // Use the MIME type to determine the file extension
        fileExtension = mimeTypes[contentType];
      }
  
      // Use fallback logic if the file extension is still unknown
      if (!fileExtension) {
        const urlObj = new URL(file_url);
        const urlPath = urlObj.pathname;
        fileExtension = urlPath.split('.').pop().toLowerCase() || '';
  
        if (!fileExtension || fileExtension === urlPath.toLowerCase()) {
          const contentDisposition = fileResponse.headers.get('Content-Disposition');
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(
              /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i
            );
            if (filenameMatch && filenameMatch[1]) {
              let filename = filenameMatch[1].replace(/['"]/g, '');
              fileExtension = filename.split('.').pop().toLowerCase();
            }
          }
        }
      }
  
      // Construct the final filename using the file_key and determined extension
      const finalFilename = `${file_key}${fileExtension ? `.${fileExtension}` : ''}`;
  
      // Convert the fetched file content into an array buffer
      const fileArrayBuffer = await fileResponse.arrayBuffer();
  
      // Define a unique boundary for multipart/form-data
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
      const formDataParts = [];
  
      // Function to recursively build multipart/form-data parts
      function buildFormDataParts(key, value) {
        let parts = [];
        if (value === null || value === undefined) {
          return parts;
        }
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              for (const [nestedKey, nestedValue] of Object.entries(item)) {
                const arrayKey = `${key}[${index}][${nestedKey}]`;
                parts = parts.concat(buildFormDataParts(arrayKey, nestedValue));
              }
            } else {
              const arrayKey = `${key}[${index}]`;
              parts = parts.concat(buildFormDataParts(arrayKey, item));
            }
          });
        } else if (typeof value === 'object') {
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            const objectKey = `${key}[${nestedKey}]`;
            parts = parts.concat(buildFormDataParts(objectKey, nestedValue));
          }
        } else {
          parts.push(
            `--${boundary}\r\n` +
              `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
              `${value}\r\n`
          );
        }
        return parts;
      }
  
      // Add additional body parameters as form-data parts
      if (body_params) {
        for (const [key, value] of Object.entries(body_params)) {
          const parts = buildFormDataParts(key, value);
          formDataParts.push(...parts);
        }
      }
  
      // Add the file as a part of the form-data
      formDataParts.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="${file_key}"; filename="${finalFilename}"\r\n`,
        `Content-Type: ${contentType}\r\n\r\n`,
        new Uint8Array(fileArrayBuffer),
        `\r\n`
      );
  
      formDataParts.push(`--${boundary}--\r\n`);
  
      // Calculate the total size of the body and assemble it
      let totalLength = formDataParts.reduce((acc, part) => {
        const partLength =
          part instanceof Uint8Array ? part.length : new TextEncoder().encode(part).length;
        return acc + partLength;
      }, 0);
  
      let body = new Uint8Array(totalLength);
      let offset = 0;
  
      formDataParts.forEach(part => {
        if (part instanceof Uint8Array) {
          body.set(part, offset);
          offset += part.length;
        } else {
          const encodedPart = new TextEncoder().encode(part);
          body.set(encodedPart, offset);
          offset += encodedPart.length;
        }
      });
  
      // Prepare headers for the outgoing request
      const fetchHeaders = new Headers();
      fetchHeaders.set('Content-Type', `multipart/form-data; boundary=${boundary}`);
  
      if (headers_to_forward) {
        let headerKeys = [];
        if (Array.isArray(headers_to_forward)) {
          headerKeys = headers_to_forward;
        } else if (typeof headers_to_forward === 'string') {
          headerKeys = headers_to_forward.split(',').map(s => s.trim());
        }
  
        for (const key of headerKeys) {
          const headerValue = requestHeaders.get(key);
          if (headerValue) {
            fetchHeaders.set(key, headerValue);
          } else {
            return new Response(`Header '${key}' not found in the request`, { status: 400 });
          }
        }
      }
  
      // Send the constructed multipart/form-data to the target endpoint
      const response = await fetch(endpointUrl.toString(), {
        method,
        headers: fetchHeaders,
        body,
      });


      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      console.log("New commit form my side testing it on cloudflare11111");

///////////////////////////////////////////////////////////////////////////////

      // Return the response received from the endpoint
      const responseBody = await response.text();
      return new Response(responseBody, { status: response.status, headers: response.headers });
    } catch (error) {
      // Return a 500 status for unexpected errors
      return new Response(`Error: ${error.message}`, { status: 500 });
    }

      
  }
  