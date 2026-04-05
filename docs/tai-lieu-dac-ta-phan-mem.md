**TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM - NHÓM 2**

**SOFTWARE REQUIREMENTS SPECIFICATION - GROUP 2**

**Đề tài 2**: Nghiên cứu Face Recognition và áp dụng xây dựng hệ thống điểm danh

**1\. GIỚI THIỆU CHUNG (INTRODUCTION)**

**1.1. Mục tiêu dự án** Tự động hóa hoàn toàn quy trình điểm danh tại các giảng đường/lớp học, giảm tải công việc hành chính cho giảng viên, ngăn chặn tình trạng điểm danh hộ và cung cấp dữ liệu chuyên cần theo thời gian thực cho nhà trường.

**1.2. Phạm vi hệ thống** Hệ thống triển khai qua các thiết bị camera đặt tại cửa các phòng học hoặc cổng khu giảng đường. Dữ liệu được đồng bộ trực tiếp với Hệ thống quản lý Đào tạo (LMS/SIS) của nhà trường.

**2\. PHÂN QUYỀN VÀ TÁC NHÂN HỆ THỐNG (ACTORS)**

- **Học sinh/Sinh viên (Student):** Đối tượng điểm danh và xem báo cáo chuyên cần cá nhân.
- **Giảng viên/Giáo viên (Lecturer/Teacher):** Quản lý sĩ số lớp học trực tiếp, phê duyệt lý do vắng mặt.
- **Phòng Đào tạo/Giám thị (Academic Affairs/Admin):** Quản lý cấu hình toàn hệ thống, theo dõi báo cáo tổng thể, xử lý ngoại lệ.
- **Hệ thống Quản lý điểm danh nội bộ của trường (Courses / Student Portal**): Đóng vai trò là hệ thống tiếp nhận dữ liệu đích. Hệ thống Điểm danh AI sau khi xử lý nhận diện thành công sẽ truyền dữ liệu thông qua API về trang Courses (để tự động cập nhật điểm chuyên cần từng môn học) và trang Portal (để cập nhật trạng thái cảnh báo học vụ, điều kiện dự thi dựa trên tổng số buổi vắng).

**3\. ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - FR)**

**3.1. Nhóm chức năng Thiết bị đầu cuối tại phòng học (Edge Device / Camera)**

- **Chức năng 1.1: Đăng ký khuôn mặt đầu khóa (Student Face Enrollment):**

\- Sinh viên đăng ký khuôn mặt bằng cách tải ảnh chân dung lên hệ thống. Hệ thống kiểm tra và lưu trữ đặc trưng khuôn mặt

\- Sinh viên đăng ký khuôn mặt bằng cách tải ảnh chân dung lên hệ thống. Hệ thống kiểm tra và lưu trữ đặc trưng khuôn mặt

\- Hệ thống kiểm tra chất lượng ảnh tự động để đảm bảo vector đặc trưng đạt chuẩn.

- **Chức năng 1.2: Điểm danh gắn với Thời khóa biểu (Schedule-based Check-in):**

\- Camera tại phòng học tự động tải cấu hình thời khóa biểu (môn học, danh sách sinh viên hợp lệ) cho ca học hiện tại.

\- Giảng viên chọn lớp học và buổi học trên hệ thống trước khi điểm danh. Hệ thống sử dụng thông tin này để xác định danh sách sinh viên hợp lệ.

\- Phân biệt trạng thái: "Có mặt", "Đi muộn" (dựa trên mốc thời gian bắt đầu tiết học).

- **Chức năng 1.3: Hoạt động Ngoại tuyến (Offline Fallback):**

\- Lưu trữ dữ liệu điểm danh cục bộ khi rớt mạng lưới (thường xuyên xảy ra tại các tòa nhà kín) và tự động đồng bộ (Auto-sync) lên server nhà trường khi có mạng.

- **Chức năng 1.4: Điểm danh dự phòng qua Ứng dụng Di động (Mobile App Fallback)**

\- **Cơ chế kích hoạt**: Chức năng này được dùng làm phương án dự phòng (Fallback) khi thiết bị Camera tại lớp gặp sự cố (mất điện, trục trặc kỹ thuật) hoặc tại các phòng học chưa được trang bị phần cứng. Giảng viên có quyền mở điểm danh qua app trên hệ thống trong một khoảng thời gian giới hạn (ví dụ: 5 phút đầu giờ).

\- **Xác thực vị trí (Geofencing):** Ứng dụng yêu cầu quyền truy cập GPS trên điện thoại sinh viên. Hệ thống sẽ đối chiếu tọa độ hiện tại của sinh viên với tọa độ của phòng học/giảng đường đã được lưu trữ. Khoảng cách sai số cho phép là dưới 10-15 mét để đảm bảo sinh viên thực sự có mặt tại lớp.

**\- Xác thực bằng khuôn mặt (Face Authentication):** Sau khi xác nhận vị trí hợp lệ, ứng dụng yêu cầu sinh viên chụp một bức ảnh khuôn mặt (Selfie). Hình ảnh này (hoặc vector đã trích xuất) sẽ được gửi thẳng về Server trung tâm. Hệ thống Core AI tại Server sẽ chịu trách nhiệm đối chiếu khuôn mặt với cơ sở dữ liệu và ghi nhận trạng thái điểm danh.

**3.2. Nhóm chức năng Quản lý Học vụ (Academic Portal)**

- **Chức năng 2.1: Dashboard Sĩ số Thời gian thực (Real-time Class Dashboard):**

\- Giảng viên xem được sĩ số lớp học ngay trên thiết bị di động/laptop: Số lượng vắng, có mặt, đi muộn mà không cần đọc tên.

- **Chức năng 2.2: Hệ thống Cảnh báo Chuyên cần (Attendance Early Warning):**

\- Tự động phát cảnh báo (qua Email/App) cho sinh viên và cố vấn học tập khi sinh viên nghỉ học chạm mốc quy định (ví dụ: vắng 15%, 20% tổng số tiết).

\- Tự động xuất danh sách "Cấm thi" gửi về Phòng Đào tạo cuối kỳ.

- **Chức năng 2.3: Xử lý Đơn từ và Ngoại lệ (Excuse Management):**

\- Cho phép sinh viên nộp minh chứng nghỉ phép (giấy khám bệnh).

\- Giảng viên/Phòng Đào tạo duyệt đơn để hệ thống cập nhật trạng thái từ "Vắng không phép" sang "Có phép".

- **Chức năng 2.4: Tích hợp luồng dữ liệu Giáo dục (EdTech Integration):**

\- Cung cấp API đẩy dữ liệu điểm danh theo từng tiết học vào hệ thống LMS để tự động tính "Điểm chuyên cần" trong tổng điểm môn học.

\- Hệ thống cung cấp API giả lập để minh họa việc tích hợp với hệ thống bên ngoài.

**3.3. Nhóm chức năng Lõi AI**

- **Chức năng 3.1: Nhận diện đám đông (Crowd Face Detection & Tracking):**

**\-** Phải có khả năng nhận diện cùng lúc nhiều khuôn mặt (Concurrency) khi hàng chục sinh viên ùa vào cửa giảng đường cùng lúc trước giờ chuông reo.

- **Chức năng 3.2: Chống giả mạo (Anti-Spoofing / Liveness Detection):**

\- Ngăn chặn triệt để hành vi sinh viên dùng ảnh thẻ, điện thoại hoặc iPad giơ lên trước camera để điểm danh hộ bạn.

- **Chức năng 3.3: Đối chiếu Vector tốc độ cao (High-speed Vector Matching):**

\- Khả năng quét tìm kiếm khuôn mặt trên cơ sở dữ liệu hàng chục ngàn sinh viên toàn trường trong thời gian 1 - 2 giây .

**4\. ĐẶC TẢ YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)**

- **Chức năng 1. Chịu tải hệ thống (High Concurrency Load):**

\- Hệ thống Server trung tâm phải chịu được lượng Traffic Spike (lưu lượng tăng vọt) cực lớn vào các khung giờ cố định (ví dụ: 6h45 - 7h00 sáng, 12h00 - 12h15 chiều) khi tất cả các lớp học đồng loạt điểm danh.

- **Chức năng 2. Độ tin cậy sinh trắc học:**

\- Tối thiểu hóa tỷ lệ nhận nhầm (FAR - False Acceptance Rate) để đảm bảo công bằng trong đánh giá điểm chuyên cần.

\- Hỗ trợ nhận diện tốt trong môi trường ánh sáng thay đổi liên tục tại hành lang/phòng học.

- **Chức năng 3. Quyền riêng tư của sinh viên (Data Privacy):**

\- Tuân thủ nghiêm ngặt nguyên tắc: Không lưu trữ hình ảnh gốc của sinh viên sau khi trích xuất, chỉ lưu chuỗi số hóa (Vector Embeddings).

**5\. YÊU CẦU VỀ TRIỂN KHAI VÀ HẠ TẦNG (DEPLOYMENT & INFRASTRUCTURE)**

**5.1. Nền tảng xử lý Backend lõi (Core Backend System)**

**\- Công nghệ lựa chọn:**

Hệ thống Backend được xây dựng bằng NodeJS (ExpressJS) nhằm cung cấp các API phục vụ chức năng điểm danh, quản lý sinh viên và lớp học.

Module AI nhận diện khuôn mặt được xây dựng bằng Python (sử dụng thư viện như OpenCV, face_recognition hoặc Deep Learning model) và giao tiếp với Backend thông qua REST API.

**\- Xử lý đồng thời:**

Backend hỗ trợ xử lý nhiều request đồng thời thông qua cơ chế bất đồng bộ (asynchronous) của NodeJS, đảm bảo đáp ứng nhu cầu điểm danh trong phạm vi một lớp học.

**\- Bộ nhớ đệm (Caching):**

Trong phạm vi prototype, hệ thống chưa triển khai caching. Tuy nhiên, có thể mở rộng sử dụng Redis để lưu trữ tạm thời dữ liệu thời khóa biểu nhằm tối ưu hiệu năng trong tương lai.

**5.2. Giao diện người dùng (Frontend System)**

**\- Công nghệ lựa chọn:**

Hệ thống Frontend được xây dựng bằng NextJS nhằm cung cấp giao diện trực quan cho người dùng (giảng viên và sinh viên).

**\- Chức năng chính:**

\+ Hiển thị danh sách lớp học và sinh viên

\+ Hiển thị trạng thái điểm danh theo thời gian thực

\+ Cho phép giảng viên thực hiện điểm danh (kích hoạt camera)

\+ Hiển thị báo cáo chuyên cần

**\- Giao tiếp hệ thống:**

Frontend giao tiếp với Backend thông qua REST API để lấy và gửi dữ liệu.

**5.3. Kiến trúc Cơ sở dữ liệu (Database Architecture)**

**\- Cơ sở dữ liệu quan hệ (RDBMS):**

Sử dụng PostgreSQL hoặc MySQL để lưu trữ thông tin sinh viên, cấu hình thời khóa biểu, nhật ký hệ thống và dữ liệu chuyên cần thô.

**\- Cơ sở dữ liệu Vector (Vector Database):**

Phân tách và sử dụng cơ sở dữ liệu chuyên dụng (như Milvus, Qdrant hoặc Pinecone) để lưu trữ và quản lý hàng chục nghìn Vector sinh trắc học. Cấu trúc này bắt buộc phải có để thuật toán tìm kiếm lân cận (ANN) đạt được tốc độ đối chiếu dưới 1 giây/người.

\- Sử dụng cơ sở dữ liệu thông thường (MongoDB/PostgreSQL) để lưu trữ thông tin và đặc trưng khuôn mặt.

**5.4. Quy trình Phân phối và Vận hành Tự động (DevOps & CI/CD)**

**\- Cập nhật không gián đoạn (Zero-Downtime Deployment):**

Đóng gói toàn bộ dịch vụ bằng Docker và quản lý vòng đời bằng **Kubernetes (K8s).** Áp dụng chiến lược triển khai Blue-Green hoặc Canary để đẩy các bản cập nhật phần mềm lên Server mà hệ thống điểm danh của trường không bị gián đoạn bất kỳ giây nào.

**\- Quản lý cấu hình thiết bị biên (Edge Device OTA):**

Xây dựng luồng cập nhật qua giao thức không dây (OTA - Over-The-Air). Khi kỹ sư tối ưu hóa được một phiên bản AI Model mới (nhận diện chính xác hơn hoặc chống giả mạo tốt hơn), pipeline CI/CD sẽ tự động nén và "bắn" model này xuống hàng loạt camera/thiết bị tại các giảng đường vào khung giờ ban đêm.

**\- Giám sát và Cảnh báo chủ động (Monitoring & Alerting):**

Tích hợp hệ thống giám sát thời gian thực (như Prometheus & Grafana) để theo dõi tình trạng sức khỏe của cụm Server và các thiết bị biên. Tự động gửi cảnh báo cho ban quản trị IT nếu phát hiện camera tại phòng học cụ thể bị mất kết nối mạng hoặc server có dấu hiệu quá tải RAM/CPU.