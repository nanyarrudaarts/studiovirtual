import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { CertificatePDF } from '../components/common/CertificatePDF';
import type { CertificateData } from '../components/common/CertificatePDF';

export const generateCertificateBlob = async (data: CertificateData): Promise<Blob> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(CertificatePDF, { data }) as React.ReactElement<any>;
  const asPdf = pdf(doc);
  return await asPdf.toBlob();
};

export const downloadCertificate = async (data: CertificateData, fileName: string) => {
  const blob = await generateCertificateBlob(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
