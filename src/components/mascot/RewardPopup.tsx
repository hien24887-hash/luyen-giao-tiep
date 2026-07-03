import Mascot from "./Mascot";

interface RewardPopupProps {
  newTrophies: number;
  newMoneyVnd: number;
  onClose: () => void;
}

export default function RewardPopup({ newTrophies, newMoneyVnd, onClose }: RewardPopupProps) {
  return (
    <div className="reward-overlay" role="dialog" aria-modal="true">
      <div className="reward-modal">
        <Mascot pose="cheer" size={130} />
        <h3>🎉 Chúc mừng con!</h3>
        {newTrophies > 0 && (
          <p className="reward-line">
            Con vừa nhận được <strong>{newTrophies} 🏆 cúp</strong> mới!
          </p>
        )}
        {newMoneyVnd > 0 && (
          <p className="reward-line">
            Và <strong>{newMoneyVnd.toLocaleString("vi-VN")}đ</strong> tiền thưởng từ bố mẹ! 💰
          </p>
        )}
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Tuyệt vời!
        </button>
      </div>
    </div>
  );
}
