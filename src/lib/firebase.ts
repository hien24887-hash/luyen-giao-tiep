// Cấu hình Firebase cho ứng dụng. Các giá trị này KHÔNG phải bí mật — Firebase
// web API key chỉ dùng để xác định đúng project, việc bảo vệ dữ liệu thực sự
// nằm ở Firestore Security Rules + Firebase Authentication, nên có thể lưu
// thẳng trong mã nguồn (khác với secret key phía server).
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA36pOYvwtXXdSI7JDoygb8kxYr8vPwpIE",
  authDomain: "luyen-giao-tiep.firebaseapp.com",
  projectId: "luyen-giao-tiep",
  storageBucket: "luyen-giao-tiep.firebasestorage.app",
  messagingSenderId: "274483926228",
  appId: "1:274483926228:web:aa9af2a1a566384b9e9741",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
