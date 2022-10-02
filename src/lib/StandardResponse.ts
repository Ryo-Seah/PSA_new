// This module standardise the API responses
import express from 'express'

function success<T>(
  expressResponse: express.Response,
  data: T,
): express.Response {
  return expressResponse.status(200).json({
    status: 'OK',
    data: data,
  })
}

// Enforce passing in errors and errorCode (keyof errors)
// so that all APIs must have display all errors in its code
// and also allows type checking based on error code
function fail<T>(
  expressResponse: express.Response,
  errors: T,
  errorCode: keyof T,
): express.Response {
  return expressResponse.status(400).json({
    status: 'Err',
    error: { code: errorCode, message: errors[errorCode] },
  })
}

function successBuffer(
  expressResponse: express.Response,
  data: Buffer,
  headers: {
    cacheControl: string
    contentType: string
    disposition: string | null
  },
): void {
  expressResponse.setHeader('Content-Type', headers.contentType)
  expressResponse.setHeader(
    'Cache-Control',
    headers.cacheControl, // max-age is in seconds
  )
  if (headers.disposition != null) {
    expressResponse.setHeader('Content-Disposition', headers.disposition)
  }
  expressResponse.send(data)
}

// Used to catch errors from API where we did not anticipate
// eg. null exception
function serverFail(
  expressRequest: express.Request,
  expressResponse: express.Response,
  error: Error,
): express.Response {
  // Log to server
    console.log(error)


  return expressResponse.status(500).json({
    status: 'Fail',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred.',
    },
  })
}

// get jwt token from the request header


// get document access token from the request header

// Export as one object
// To be used as Response.success(..) or Response.fail(..)
export default {
  success,
  fail,
  serverFail,
  successBuffer,
}
