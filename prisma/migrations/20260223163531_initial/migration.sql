-- CreateEnum
CREATE TYPE "InvoiceEstado" AS ENUM ('DRAFT', 'SIGNED', 'SENT', 'AUTHORIZED', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "Ambiente" AS ENUM ('TEST', 'PROD');

-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_REMISION', 'RETENCION');

-- CreateEnum
CREATE TYPE "TipoIdentificacion" AS ENUM ('RUC', 'CEDULA', 'PASAPORTE', 'CONSUMIDOR_FINAL');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "dirMatriz" TEXT NOT NULL,
    "dirEstablecimiento" TEXT NOT NULL,
    "contribuyenteEspecial" TEXT,
    "obligadoContabilidad" TEXT NOT NULL DEFAULT 'SI',
    "establecimiento" TEXT NOT NULL DEFAULT '001',
    "puntoEmision" TEXT NOT NULL DEFAULT '001',
    "logoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" TEXT NOT NULL,
    "ambiente" "Ambiente" NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "secuencial" TEXT,
    "claveAcceso" TEXT,
    "estado" "InvoiceEstado" NOT NULL DEFAULT 'DRAFT',
    "ambiente" "Ambiente" NOT NULL,
    "tipoComprobante" "TipoComprobante" NOT NULL DEFAULT 'FACTURA',
    "fechaEmision" TIMESTAMP(3),
    "tipoIdentificacionComprador" "TipoIdentificacion",
    "razonSocialComprador" TEXT,
    "identificacionComprador" TEXT,
    "emailComprador" TEXT,
    "telefonoComprador" TEXT,
    "totalSinImpuestos" DECIMAL(10,2),
    "totalDescuento" DECIMAL(10,2) DEFAULT 0,
    "totalIva" DECIMAL(10,2),
    "importeTotal" DECIMAL(10,2),
    "xmlGenerado" TEXT,
    "xmlFirmado" TEXT,
    "pdfPath" TEXT,
    "sriResponse" JSONB,
    "errorMessage" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "codigoPrincipal" TEXT NOT NULL,
    "codigoAuxiliar" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL,
    "precioUnitario" DECIMAL(10,4) NOT NULL,
    "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precioTotalSinImpuesto" DECIMAL(10,2) NOT NULL,
    "ivaCodigo" TEXT NOT NULL DEFAULT '2',
    "ivaCodigoPorcentaje" TEXT NOT NULL DEFAULT '4',
    "ivaTarifa" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "ivaBaseImponible" DECIMAL(10,2) NOT NULL,
    "ivaValor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_audit_logs" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "estado" "InvoiceEstado" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_ruc_key" ON "companies"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_sequences_ambiente_key" ON "invoice_sequences"("ambiente");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_claveAcceso_key" ON "invoices"("claveAcceso");

-- CreateIndex
CREATE INDEX "invoices_dealId_idx" ON "invoices"("dealId");

-- CreateIndex
CREATE INDEX "invoices_estado_idx" ON "invoices"("estado");

-- CreateIndex
CREATE INDEX "invoices_ambiente_estado_idx" ON "invoices"("ambiente", "estado");

-- CreateIndex
CREATE INDEX "invoice_audit_logs_invoiceId_idx" ON "invoice_audit_logs"("invoiceId");

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_audit_logs" ADD CONSTRAINT "invoice_audit_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
