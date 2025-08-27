"use client";

import { useEffect, useRef } from "react";

type Token = "." | "-" | "/"; // dot, dash, slash (word gap)

export type PaperCanvasProps = {
  tokens: Token[];
  width?: number;
  height?: number;
  background?: string;
};

// Strategy:
// - Stream tokens are appended to `tokens`.
// - We render onto an offscreen layout using a monospace-like spacing grid per token.
// - Each token is drawn as a short line (dot) or long line (dash) on a ruled paper.
// - Flow is left-to-right, wrapping to next line. When full, we scroll content upward.

export default function PaperCanvas({ tokens, width = 900, height = 260, background = "#fff" }: PaperCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tokenIndexRef = useRef<number>(0);

  // Visual layout constants
  const lineHeight = 36; // px
  const margin = 24; // px
  const cellWidth = 18; // px per token cell
  const dotWidth = 8; // drawn length for dot
  const dashWidth = 20; // drawn length for dash

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize once
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawRuling(ctx, canvas.width, canvas.height);
    tokenIndexRef.current = 0; // full redraw on prop change

    // Render all tokens sequentially
    let x = margin;
    let y = margin + lineHeight / 2;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (x + cellWidth > canvas.width - margin) {
        // wrap
        x = margin;
        y += lineHeight;
        if (y > canvas.height - margin) {
          // scroll up one line when overflow
          scrollUpOneLine(ctx, canvas.width, canvas.height, lineHeight, background);
          y -= lineHeight;
          drawRuling(ctx, canvas.width, canvas.height);
        }
      }

      if (token === ".") {
        drawToken(ctx, x, y, dotWidth);
        x += cellWidth;
      } else if (token === "-") {
        drawToken(ctx, x, y, dashWidth);
        x += cellWidth;
      } else if (token === "/") {
        // word gap: leave empty cell
        x += cellWidth;
      }
    }
  }, [tokens, width, height, background]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-xl shadow-soft bg-white"
      style={{ display: "block" }}
    />
  );

  function drawRuling(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    // background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    // ruled paper lines
    ctx.strokeStyle = "#e5e7eb"; // gray-200
    ctx.lineWidth = 1;
    const top = margin;
    const bottom = h - margin;
    for (let y = top; y <= bottom; y += lineHeight) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(w - margin, y);
      ctx.stroke();
    }
    // left margin line
    ctx.strokeStyle = "#93c5fd"; // blue-300
    ctx.beginPath();
    ctx.moveTo(margin - 8, top - 8);
    ctx.lineTo(margin - 8, bottom + 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawToken(ctx: CanvasRenderingContext2D, x: number, y: number, length: number) {
    ctx.save();
    ctx.strokeStyle = "#111827"; // gray-900
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + 2 + length, y);
    ctx.stroke();
    ctx.restore();
  }

  function scrollUpOneLine(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    amount: number,
    bg: string
  ) {
    const imageData = ctx.getImageData(0, amount, w, h - amount);
    ctx.putImageData(imageData, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, h - amount, w, amount);
  }
}


