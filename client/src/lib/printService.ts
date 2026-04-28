import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type PrinterType = 'thermal' | 'normal' | 'auto';
export type DeviceType = 'android' | 'desktop' | 'unknown';

export class PrintService {
  static getDeviceType(): DeviceType {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) return 'desktop';
    return 'unknown';
  }

  static isAndroid(): boolean {
    return this.getDeviceType() === 'android';
  }

  static async printElement(
    element: HTMLElement,
    printerType: PrinterType = 'auto',
    options?: {
      filename?: string;
      paperSize?: 'a4' | 'thermal';
      orientation?: 'portrait' | 'landscape';
    }
  ): Promise<void> {
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      });

      const deviceType = this.getDeviceType();
      const finalPrinterType = printerType === 'auto' ? this.getDefaultPrinter(deviceType) : printerType;

      if (deviceType === 'android' && finalPrinterType === 'thermal') {
        // For Android thermal printer via Bluetooth
        await this.printAndroidThermal(canvas);
      } else if (deviceType === 'android') {
        // For Android normal printer
        await this.printAndroidNormal(canvas);
      } else {
        // For Desktop - generate PDF
        await this.printDesktop(canvas, options);
      }
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  private static getDefaultPrinter(deviceType: DeviceType): PrinterType {
    if (deviceType === 'android') return 'thermal';
    return 'normal';
  }

  private static async printAndroidThermal(canvas: HTMLCanvasElement): Promise<void> {
    const imgData = canvas.toDataURL('image/png');
    
    // Try to use Android print API
    if ((window as any).android?.printThermal) {
      (window as any).android.printThermal(imgData);
    } else if (window.print) {
      window.print();
    }
  }

  private static async printAndroidNormal(canvas: HTMLCanvasElement): Promise<void> {
    const imgData = canvas.toDataURL('image/png');
    
    // Try to use Android print API
    if ((window as any).android?.print) {
      (window as any).android.print(imgData);
    } else if (window.print) {
      window.print();
    }
  }

  private static async printDesktop(
    canvas: HTMLCanvasElement,
    options?: {
      filename?: string;
      paperSize?: 'a4' | 'thermal';
      orientation?: 'portrait' | 'landscape';
    }
  ): Promise<void> {
    const paperSize = options?.paperSize || 'a4';
    const orientation = options?.orientation || 'portrait';
    const filename = options?.filename || `receipt-${Date.now()}.pdf`;

    let pdfFormat: [number, number] = [210, 297]; // A4

    if (paperSize === 'thermal') {
      pdfFormat = [80, 50]; // Thermal label size
    }

    const pdf = new jsPDF({
      orientation: orientation === 'landscape' ? 'l' : 'p',
      unit: 'mm',
      format: pdfFormat,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pdfFormat[0];
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  }

  static async printDirectly(
    element: HTMLElement,
    printerType: PrinterType = 'auto'
  ): Promise<void> {
    if (!element) return;

    const deviceType = this.getDeviceType();
    const finalPrinterType = printerType === 'auto' ? this.getDefaultPrinter(deviceType) : printerType;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');

      if (deviceType === 'android') {
        // Send to Android native print
        if ((window as any).android?.printDirect) {
          (window as any).android.printDirect(imgData, finalPrinterType);
        } else {
          window.print();
        }
      } else {
        // Desktop print dialog
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
          printWindow.document.write(`<img src="${imgData}" style="width:100%;">`);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (error) {
      console.error('Direct print error:', error);
      throw error;
    }
  }
}
