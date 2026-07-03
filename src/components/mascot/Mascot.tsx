// Linh vật avatar của app — nhân vật robot đơn giản, dễ thương, lấy cảm hứng
// chung từ các avatar hoá thân phổ biến (không sao chép nhân vật có bản
// quyền cụ thể nào). Bản rút gọn: không có hệ thống thay đồ/tủ đồ.

export type MascotPose = "idle" | "cheer";

interface MascotProps {
  pose?: MascotPose;
  size?: number;
}

const INK = "#1b1b1b";
const SKIN = "#f5f6fa";
const TOP = "#5dade2";
const BOTTOM = "#dfe6e9";
const SHOES = "#dcdde1";

export default function Mascot({ pose = "idle", size = 96 }: MascotProps) {
  const cheering = pose === "cheer";

  return (
    <svg width={size} height={(size * 250) / 200} viewBox="0 0 200 250" role="img" aria-label="Bạn avatar mèo máy">
      {cheering && (
        <g fill="#f4c53d" opacity={0.9}>
          <circle cx="20" cy="50" r="5" />
          <circle cx="180" cy="46" r="4" />
          <circle cx="16" cy="150" r="4" />
          <circle cx="186" cy="140" r="5" />
          <circle cx="100" cy="10" r="4" />
        </g>
      )}

      {/* Chân (da) */}
      <rect x="74" y="196" width="16" height="42" rx="6" fill={SKIN} stroke={INK} strokeWidth="2" />
      <rect x="110" y="196" width="16" height="42" rx="6" fill={SKIN} stroke={INK} strokeWidth="2" />

      {/* Giày */}
      <rect x="70" y="228" width="26" height="16" rx="8" fill={SHOES} stroke={INK} strokeWidth="2" />
      <rect x="104" y="228" width="26" height="16" rx="8" fill={SHOES} stroke={INK} strokeWidth="2" />

      {/* Quần */}
      <rect x="66" y="162" width="68" height="32" rx="14" fill={BOTTOM} stroke={INK} strokeWidth="2" />

      {/* Tay */}
      {cheering ? (
        <>
          <rect x="18" y="98" width="20" height="52" rx="10" fill={SKIN} stroke={INK} strokeWidth="2" transform="rotate(-35 28 104)" />
          <rect x="162" y="98" width="20" height="52" rx="10" fill={SKIN} stroke={INK} strokeWidth="2" transform="rotate(35 172 104)" />
        </>
      ) : (
        <>
          <rect x="38" y="104" width="20" height="54" rx="10" fill={SKIN} stroke={INK} strokeWidth="2" />
          <rect x="142" y="104" width="20" height="54" rx="10" fill={SKIN} stroke={INK} strokeWidth="2" />
        </>
      )}

      {/* Áo */}
      <rect x="64" y="98" width="72" height="64" rx="20" fill={TOP} stroke={INK} strokeWidth="2" />

      {/* Cổ */}
      <rect x="90" y="88" width="20" height="14" fill={SKIN} stroke={INK} strokeWidth="2" />

      {/* Đầu */}
      <circle cx="100" cy="52" r="42" fill={SKIN} stroke={INK} strokeWidth="2.5" />

      {/* Mắt */}
      <ellipse cx="84" cy="50" rx="7" ry="10" fill={INK} />
      <ellipse cx="116" cy="50" rx="7" ry="10" fill={INK} />
      {cheering && (
        <>
          <path d="M 76 50 Q 84 42 92 50" stroke="#ffffff" strokeWidth="2" fill="none" opacity={0.5} />
          <path d="M 108 50 Q 116 42 124 50" stroke="#ffffff" strokeWidth="2" fill="none" opacity={0.5} />
        </>
      )}

      {cheering && <path d="M 88 68 Q 100 78 112 68" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
