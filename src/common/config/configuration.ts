export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    prefix: process.env.API_PREFIX || 'api/v1',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'insecure-default-change-me',
    expiration: process.env.JWT_EXPIRATION || '86400s',
  },

  sri: {
    env: (process.env.SRI_ENV || 'TEST') as 'TEST' | 'PROD',
    recepcion: {
      test:
        process.env.SRI_RECEPCION_TEST ||
        'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
      prod:
        process.env.SRI_RECEPCION_PROD ||
        'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    },
    autorizacion: {
      test:
        process.env.SRI_AUTORIZACION_TEST ||
        'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
      prod:
        process.env.SRI_AUTORIZACION_PROD ||
        'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
    },
    pollIntervalMs: parseInt(process.env.SRI_AUTH_POLL_INTERVAL_MS || '5000', 10),
    maxRetries: parseInt(process.env.SRI_AUTH_MAX_RETRIES || '12', 10),
  },

  company: {
    ruc: process.env.COMPANY_RUC || '',
    razonSocial: process.env.COMPANY_RAZON_SOCIAL || '',
    nombreComercial: process.env.COMPANY_NOMBRE_COMERCIAL || '',
    dirMatriz: process.env.COMPANY_DIR_MATRIZ || '',
    dirEstablecimiento: process.env.COMPANY_DIR_ESTABLECIMIENTO || '',
    contribuyenteEspecial: process.env.COMPANY_CONTRIBUYENTE_ESPECIAL || '',
    obligadoContabilidad: process.env.COMPANY_OBLIGADO_CONTABILIDAD || 'SI',
    establecimiento: process.env.COMPANY_ESTABLECIMIENTO || '001',
    puntoEmision: process.env.COMPANY_PUNTO_EMISION || '001',
  },

  signing: {
    certPath: process.env.SIGNING_CERT_PATH || './certs/certificate.p12',
    certPassword: process.env.SIGNING_CERT_PASSWORD || '',
  },

  pdf: {
    outputDir: process.env.PDF_OUTPUT_DIR || './storage/pdfs',
  },

  bitrix: {
    webhookUrl: process.env.BITRIX_WEBHOOK_URL || '',
    dealStageFacturado: process.env.BITRIX_DEAL_STAGE_FACTURADO || '',
    dealStageError: process.env.BITRIX_DEAL_STAGE_ERROR || '',
  },
});
