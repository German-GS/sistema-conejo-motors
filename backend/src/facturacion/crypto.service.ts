// backend/src/facturacion/crypto.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// fs y node-forge ya no son necesarios para la simulación
// import * as fs from 'fs';
// import * as forge from 'node-forge';

@Injectable()
export class CryptoService {
  constructor(private configService: ConfigService) {}

  /**
   * SIMULACIÓN: Devuelve el XML firmado en formato Base64.
   * En producción, esta función contendrá la lógica de firma real.
   */
  async signXml(xmlSinFirma: string): Promise<string> {
    try {
      // --- INICIO DE LA MODIFICACIÓN ---
      console.log('--- MODO SIMULACIÓN: Omitiendo firma con llave criptográfica ---');
      // Simplemente devolvemos el mismo XML codificado en Base64.
      // Esto es suficiente para que el flujo continúe sin errores.
      const xmlSimuladoCompleto = xmlSinFirma.replace('</FacturaElectronica>', `<Signature>--SIMULACION--</Signature></FacturaElectronica>`);
      return Buffer.from(xmlSimuladoCompleto).toString('base64');
      // --- FIN DE LA MODIFICACIÓN ---

    } catch (error) {
      console.error('Error durante la simulación de firma:', error);
      throw new InternalServerErrorException('No se pudo simular la firma del documento.');
    }
  }
}





//Codigo de originala para la coneccion con tribu-cr 




// // backend/src/facturacion/crypto.service.ts
// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as fs from 'fs';
// import * as forge from 'node-forge';

// @Injectable()
// export class CryptoService {
//   constructor(private configService: ConfigService) {}

//   /**
//    * Firma un documento XML con la llave criptográfica P12.
//    * @param xmlSinFirma El string del XML a firmar.
//    * @returns El XML firmado en formato Base64.
//    */
//   async signXml(xmlSinFirma: string): Promise<string> {
//     try {
//       const p12Path = this.configService.getOrThrow<string>('CRYPTO_KEY_PATH');
//       const p12Pin = this.configService.getOrThrow<string>('CRYPTO_KEY_PIN');

//       // 1. Leer el archivo de la llave criptográfica
//       const p12Asn1 = forge.asn1.fromDer(fs.readFileSync(p12Path, 'binary'));
//       const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, p12Pin);

//       // 2. Extraer el certificado y la llave privada
//       const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
//       const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

//       const cert = certBags[forge.pki.oids.certBag][0].cert;
//       const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

//       // 3. Crear la estructura de firma XAdES-EPES (simplificado para este ejemplo)
//       // Nota: Una implementación completa requiere una estructura XAdES más compleja.
//       // Por ahora, usamos una firma PKCS7 estándar que es un buen punto de partida.
//       const p7 = forge.pkcs7.createSignedData();
//       p7.content = forge.util.createBuffer(xmlSinFirma, 'utf8');
//       p7.addCertificate(cert);
//       p7.addSigner({
//         key: privateKey,
//         certificate: cert,
//         digestAlgorithm: forge.pki.oids.sha256,
//       });

//       // 4. Firmar el documento
//       p7.sign();

//       // 5. Convertir a formato DER y luego a Base64
//       const signedDataDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
//       const signedDataB64 = forge.util.encode64(signedDataDer);

//       // En un caso real, el XML firmado se incrusta dentro del mismo XML original.
//       // Por simplicidad en este paso, devolvemos un placeholder, pero la lógica de firma es la importante.
//       // La integración final con Tribu CR podría requerir un formato específico.
//       // Este es un paso fundamental que ahora tienes resuelto.
      
//       // Simulación de incrustación para el siguiente paso
//       const xmlFirmadoCompleto = xmlSinFirma.replace('</FacturaElectronica>', `<Signature>...${signedDataB64.substring(0, 100)}...</Signature></FacturaElectronica>`);


//       return Buffer.from(xmlFirmadoCompleto).toString('base64');

//     } catch (error) {
//       console.error('Error al firmar el XML:', error);
//       throw new InternalServerErrorException('No se pudo firmar el documento.');
//     }
//   }
// }