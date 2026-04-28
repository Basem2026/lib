import { useEffect, useRef, useState } from 'react';

interface BankCardProps {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  bankId?: string; // إضافة bankId لتحديد المصرف
  isFlipped?: boolean;
}

// تكوين المصارف المدعومة
const BANK_CONFIGS: Record<string, {
  cardImage: string;
  textColor: string;
  cardNumberPosition: { x: number; y: number };
  namePosition: { x: number; y: number };
  expiryPosition: { x: number; y: number };
  fontSize: {
    cardNumber: number;
    name: number;
    expiry: number;
  };
}> = {
  aman: {
    cardImage: '/aman-card.png',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.72 },
    namePosition: { x: 0.08, y: 0.85 },
    expiryPosition: { x: 0.92, y: 0.85 },
    fontSize: {
      cardNumber: 28,
      name: 20,
      expiry: 18
    }
  },
  nab: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/SxjmkSWFrBpXPfMW.png',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  atib: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/EjQUlYgXhXpRyUyn.png',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  jumhouria: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/TGTlIwUrRzGjrUMe.png',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  united: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/XoTNOZthZcYAGprL.png',
    textColor: '#1a1a1a',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  ncb: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/xGpllGYkrpBQjKRj.png',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  yaqeen: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/ZOEYakMyLnxFWydE.png',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  sahara: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/uHfstOWaIoRNqZnp.png',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  andalus: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/ayvDJGZBeLRLiXWc.jpeg',
    textColor: '#FFFFFF',
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  wahda: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/MUChnLOIArvdnGDI.png',
    textColor: '#1a1a1a', // لون داكن لأن الخلفية فضية فاتحة
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  libbank: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/BjLzpqMziSaHWfIC.png',
    textColor: '#FFFFFF', // لون أبيض للخلفية الرمادية
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  nuran: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/HlNzNsaDdJJKDpWg.png',
    textColor: '#D4AF37', // لون ذهبي للخلفية السوداء الفاخرة
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.50, y: 0.78 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 22
    }
  },
  bcd: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/WwLynAczbqLKMNUg.png',
    textColor: '#FFFFFF', // لون أبيض للخلفية المتدرجة (أزرق داكن إلى أخضر فيروزي)
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.08, y: 0.52 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 18
    }
  },
  alwaha: {
    cardImage: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/ScXPjRRxmGTqfGCL.png',
    textColor: '#003D7A', // لون أزرق داكن للخلفية الفضية
    cardNumberPosition: { x: 0.08, y: 0.62 },
    namePosition: { x: 0.08, y: 0.90 },
    expiryPosition: { x: 0.08, y: 0.52 },
    fontSize: {
      cardNumber: 36,
      name: 24,
      expiry: 18
    }
  }
};

export function BankCard({ 
  cardNumber, 
  cardholderName, 
  expiryDate, 
  cvv,
  bankId = 'aman', // القيمة الافتراضية
  isFlipped = false 
}: BankCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // الحصول على تكوين المصرف أولاً
  const config = BANK_CONFIGS[bankId] || BANK_CONFIGS.aman;

  // قائمة صور البطاقات للأنيمشن - نفس الصورة للحفاظ على التصميم
  const cardImages = [config.cardImage];

  // لا حاجة لتغيير الصور - الأنيمشن CSS سيقوم بالعمل

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (16:10 aspect ratio for card)
    const width = 640;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Load and draw the background image
    const img = new Image();
    img.src = cardImages[currentImageIndex];
    
    img.onload = () => {
      // Draw image to fill canvas
      ctx.drawImage(img, 0, 0, width, height);

      // الصورة الجديدة نظيفة بدون بيانات، لا حاجة لإخفاء شيء

      if (!isFlipped) {
        // ===== FRONT OF CARD - Write Data =====
        
        // Format card number with spaces
        const formattedCardNumber = cardNumber
          .replace(/\s/g, '')
          .match(/.{1,4}/g)
          ?.join(' ') || cardNumber;

        // إعداد النص مع ظل للوضوح
        ctx.fillStyle = config.textColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // ===== رقم البطاقة =====
        ctx.font = `bold ${config.fontSize.cardNumber}px "Courier New", monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(
          formattedCardNumber, 
          width * config.cardNumberPosition.x, 
          height * config.cardNumberPosition.y
        );

        // ===== اسم حامل البطاقة =====
        ctx.font = `bold ${config.fontSize.name}px Arial`;
        ctx.fillText(
          cardholderName.toUpperCase(), 
          width * config.namePosition.x, 
          height * config.namePosition.y
        );

        // ===== تاريخ الصلاحية =====
        ctx.font = `bold ${config.fontSize.expiry}px "Courier New", monospace`;
        ctx.textAlign = bankId === 'aman' ? 'right' : 'left';
        ctx.fillText(
          expiryDate, 
          width * config.expiryPosition.x, 
          height * config.expiryPosition.y
        );

        // إزالة الظل
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

      } else {
        // ===== BACK OF CARD =====
        // Add dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, width, height);

        // Magnetic stripe
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, height * 0.12, width, height * 0.25);

        // Stripe pattern
        ctx.fillStyle = '#333333';
        for (let i = 0; i < width; i += 8) {
          ctx.fillRect(i, height * 0.12, 4, height * 0.25);
        }

        // CVV box
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(width * 0.75, height * 0.45, width * 0.18, height * 0.12);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CVV', width * 0.84, height * 0.52);
        
        ctx.font = 'bold 20px monospace';
        ctx.fillText(cvv, width * 0.84, height * 0.62);

        // Signature area
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.strokeRect(width * 0.06, height * 0.65, width * 0.35, height * 0.18);
        
        ctx.fillStyle = '#d4af37';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Cardholder Signature', width * 0.08, height * 0.73);

        // Security text
        ctx.fillStyle = '#d4af37';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('This card is the sole property of the cardholder.', width / 2, height * 0.90);
        ctx.fillText('Unauthorized use is prohibited and subject to legal action.', width / 2, height * 0.96);
      }
    };

    img.onerror = () => {
      // Fallback if image fails to load
      ctx.fillStyle = '#1e90ff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Failed to load card image', width / 2, height / 2);
    };

  }, [cardNumber, cardholderName, expiryDate, cvv, bankId, isFlipped, currentImageIndex, cardImages]);

  return (
    <div className="flex justify-center items-center relative">
      <canvas
        ref={canvasRef}
        className="rounded-3xl shadow-2xl card-slider-animation"
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        }}
      />
    </div>
  );
}
