import { Link } from 'react-router-dom';
import { ArrowLeft, Database, FileText, LockKeyhole, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import LandingFooter from '../components/LandingFooter';

const legalContent = {
  privacy: {
    eyebrow: 'Data Protection',
    title: 'Chính sách quyền riêng tư',
    updatedAt: 'Cập nhật: 02/07/2026',
    intro: 'EventFlow xử lý dữ liệu cá nhân để tạo tài khoản, vận hành sự kiện, phân quyền thành viên, gửi thông báo và hỗ trợ thanh toán khi người dùng sử dụng gói trả phí.',
    sections: [
      {
        icon: Database,
        title: 'Dữ liệu được thu thập',
        items: [
          'Thông tin tài khoản: họ tên, email, số điện thoại nếu người dùng cập nhật.',
          'Dữ liệu vận hành sự kiện: vai trò trong event, phòng ban, task, báo cáo, tài liệu đính kèm và thông báo.',
          'Dữ liệu check-in: tên, email, số điện thoại khách mời khi người tổ chức nhập hoặc import.',
          'Dữ liệu thanh toán tối thiểu: mã đơn, gói, số tiền, trạng thái và mã giao dịch từ cổng thanh toán.',
        ],
      },
      {
        icon: ShieldCheck,
        title: 'Mục đích xử lý',
        items: [
          'Xác thực tài khoản, phân quyền và bảo vệ phiên đăng nhập.',
          'Cung cấp tính năng quản lý sự kiện, task, thành viên, check-in, báo cáo và thông báo.',
          'Gửi email xác thực, đặt lại mật khẩu, thông báo liên quan đến tài khoản hoặc event.',
          'Phát hiện lạm dụng, ghi audit log cho thao tác quan trọng và đáp ứng yêu cầu hỗ trợ.',
        ],
      },
      {
        icon: LockKeyhole,
        title: 'Bảo vệ và lưu giữ',
        items: [
          'Mật khẩu được hash; token phiên đăng nhập được ưu tiên lưu bằng cookie httpOnly.',
          'EventFlow không cố ý log mật khẩu, access token, refresh token hoặc payload thanh toán nhạy cảm.',
          'Dữ liệu được lưu trong thời gian cần thiết cho vận hành dịch vụ, nghĩa vụ kế toán/thanh toán, bảo mật và xử lý tranh chấp.',
          'Người dùng có thể yêu cầu xuất dữ liệu hoặc xóa dữ liệu cá nhân trong trang Profile.',
        ],
      },
      {
        icon: FileText,
        title: 'Bên thứ ba',
        items: [
          'Dịch vụ email dùng để gửi xác thực tài khoản và đặt lại mật khẩu.',
          'Telegram được dùng khi người dùng chủ động liên kết để nhận thông báo.',
          'Cổng thanh toán payOS hoặc nhà cung cấp tương đương được dùng khi phát sinh giao dịch.',
          'Dịch vụ AI chỉ nhận dữ liệu tối thiểu cần thiết cho tính năng gợi ý khi người dùng kích hoạt.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'Service Terms',
    title: 'Điều khoản dịch vụ',
    updatedAt: 'Cập nhật: 02/07/2026',
    intro: 'Khi sử dụng EventFlow, người dùng đồng ý sử dụng hệ thống đúng mục đích quản lý sự kiện, bảo vệ tài khoản của mình và không đưa nội dung trái pháp luật hoặc gây hại lên dịch vụ.',
    sections: [
      {
        icon: ShieldCheck,
        title: 'Tài khoản và bảo mật',
        items: [
          'Người dùng chịu trách nhiệm giữ bí mật mật khẩu và thiết bị đăng nhập.',
          'Không chia sẻ tài khoản cho người không có quyền truy cập dữ liệu event.',
          'EventFlow có thể khóa tạm thời tài khoản khi phát hiện đăng nhập sai nhiều lần hoặc dấu hiệu lạm dụng.',
        ],
      },
      {
        icon: Database,
        title: 'Dữ liệu trong event',
        items: [
          'Leader/admin event chịu trách nhiệm bảo đảm có cơ sở phù hợp khi nhập dữ liệu thành viên hoặc khách mời.',
          'Người dùng chỉ được xem, sửa, tải lên hoặc xuất dữ liệu trong phạm vi quyền được cấp.',
          'Dữ liệu có thể được giữ lại ở dạng ẩn danh để bảo toàn lịch sử task, thanh toán, audit và báo cáo.',
        ],
      },
      {
        icon: LockKeyhole,
        title: 'Giới hạn sử dụng',
        items: [
          'Không tấn công, quét lỗ hổng, bypass phân quyền hoặc làm gián đoạn dịch vụ.',
          'Không upload mã độc, dữ liệu nhạy cảm không cần thiết hoặc nội dung vi phạm quyền của bên khác.',
          'Không dùng tính năng AI, email, Telegram hoặc payment để spam hoặc lừa đảo.',
        ],
      },
      {
        icon: FileText,
        title: 'Thay đổi và hỗ trợ',
        items: [
          'EventFlow có thể cập nhật điều khoản để phản ánh thay đổi tính năng, bảo mật hoặc yêu cầu pháp luật.',
          'Các yêu cầu xuất dữ liệu, xóa dữ liệu hoặc hỗ trợ bảo mật có thể gửi tới support@eventflow.vn.',
        ],
      },
    ],
  },
};

const LegalPage = ({ type = 'privacy' }) => {
  const content = legalContent[type] || legalContent.privacy;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FCFF] text-slate-950">
      <Header showNav={false} showLogin={false} ctaLabel="Đăng nhập" ctaTo="/login" />

      <main className="flex-1 px-5 py-10 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-sky-600 hover:text-sky-700">
            <ArrowLeft className="h-4 w-4" />
            Về trang chủ
          </Link>

          <header className="mt-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">{content.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{content.title}</h1>
            <p className="mt-3 text-sm font-bold text-slate-500">{content.updatedAt}</p>
            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-slate-600">{content.intro}</p>
          </header>

          <div className="mt-10 grid gap-5">
            {content.sections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.title} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-lg shadow-sky-100/60">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                      <ul className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600">
                        {section.items.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

export default LegalPage;
