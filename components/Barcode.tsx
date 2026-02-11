
import React, { useEffect, useRef } from 'react';

interface BarcodeProps {
  value: string;
}

declare var JsBarcode: any;

const Barcode: React.FC<BarcodeProps> = ({ value }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          height: 40,
          displayValue: true,
          textMargin: 0,
          fontSize: 12,
          margin: 5
        });
      } catch (e) {
        console.error("Barcode error:", e);
      }
    }
  }, [value]);

  return <svg ref={svgRef} className="max-w-full h-auto"></svg>;
};

export default Barcode;
