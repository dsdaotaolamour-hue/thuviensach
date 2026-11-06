/**
 * LAMOUR SPA LIBRARY & ISOV KOREA STANDARD SPA
 * Supplied frontend presentation. Authentication and persistence are provided by live.js/server API.
 */

const DEFAULT_DB = {
 settings: {libraryName:'Thư viện sách Ngành Spa',address:'',hotline:'',zaloOaId:'',lamourLoanMonths:12,guestLoanMonths:3,guestDepositAmount:500000,lateFeePerDay:5000,techFeeLostBook:20000,outOfPrintMultiplier:3,termsOnPrint:''},
 bookTitles:[],bookCopies:[],readers:[],loans:[],wallets:[],activities:[],logs:[]
};
let db = structuredClone(DEFAULT_DB);
let trackingCounter = 0;
let activeBorrowBook = null;

// loadDatabase: implemented in live.js

// saveDatabase: implemented in live.js

function formatCurrency(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('vi-VN') + 'đ';
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function emptyTableRow(colspan, title, detail) {
  return `<tr><td colspan="${colspan}"><div class="empty-table"><span>⌕</span><strong>${title}</strong><small>${detail}</small></div></td></tr>`;
}

/* ==========================================================================
   TRACKING EVENTS (Theo Đặc tả V.2)
   - click_borrow_book_btn
   - copy_book_info
   - redirect_zalo_oa
   - click_drive_folder
   ========================================================================== */
function trackEvent(eventName, payload = {}) {
  trackingCounter += 1;
  const badge = document.getElementById('trackingStatusBadge');
  if (badge) {
    badge.textContent = `Tracking: ${eventName} (${trackingCounter} events)`;
  }
  console.info(`[Tracking Event] ${eventName}`, payload);
}

/* ==========================================================================
   SPA ROUTING (Public Pages 01, 02, 03 + Login + Internal Admin)
   ========================================================================== */
function navigateTo(pageKey) {
  if (pageKey === 'admin' && !window.liveSession) pageKey = 'login';
  const pages = ['home', 'catalog', 'book', 'isov', 'data', 'login', 'admin'];
  pages.forEach(k => {
    const el = document.getElementById(`page-${k}`);
    if (el) el.classList.toggle('active', k === pageKey);
  });

  // Ẩn/hiện Header & Footer công khai khi vào hệ thống bên trong (/admin)
  const publicHeader = document.getElementById('publicHeader');
  const publicFooter = document.getElementById('publicFooter');
  if (pageKey === 'admin') {
    if (publicHeader) publicHeader.style.display = 'none';
    if (publicFooter) publicFooter.style.display = 'none';
    renderAllAdminViews();
  } else {
    if (publicHeader) publicHeader.style.display = '';
    if (publicFooter) publicFooter.style.display = '';
  }

  // Highlight active menu
  document.querySelectorAll('.main-nav .nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === (pageKey === 'book' ? 'catalog' : pageKey));
  });

  // Close mobile menu if open
  const mainNav = document.getElementById('mainNav');
  if (mainNav) mainNav.classList.remove('open');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.toggle('open');
}

function scrollToInventory(event) {
  event?.preventDefault();
  location.hash = '#/kho-sach';
}
function scrollToElement(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

/* ==========================================================================
   COMPUTED HELPERS (Tự động đếm bản sao & đối soát ví theo chuẩn Book1)
   ========================================================================== */
function getBookCounts(bookId) {
  const copies = db.bookCopies.filter(c => c.bookId === bookId);
  const activeCopies = copies.filter(c => c.status !== 'Mất' && c.status !== 'Thanh lý');
  const available = activeCopies.filter(c => c.status === 'Có sẵn').length;
  const borrowed = activeCopies.filter(c => c.status === 'Đang mượn').length;
  const repairing = activeCopies.filter(c => c.status === 'Đang sửa').length;
  return {
    total: activeCopies.length,
    available,
    borrowed,
    repairing
  };
}

// getWalletStats: implemented in live.js

let catalogPage = 1;

function bookUrl(book) {
  return '#/kho-sach/' + encodeURIComponent(book.id);
}

function bookCover(book) {
  if (book.coverUrl) return `<img src="${book.coverUrl}" alt="Bìa sách ${book.title}" loading="lazy">`;
  return `<div class="library-cover-placeholder"><span>THƯ VIỆN LAMOUR</span><strong>${book.title}</strong><span>${book.author}</span></div>`;
}

function bookCard(book) {
  const available = getBookCounts(book.id).available;
  return `<article class="book-card library-card">
    <a href="${esc(bookUrl(book))}" class="library-card-link">
      <div class="library-card-cover">
        <span class="library-stock ${available ? '' : 'unavailable'}">${available ? 'Số lượng tồn: ' + String(available).padStart(2, '0') : 'Hết sách'}</span>
        ${bookCover(book)}
      </div>
      <div class="book-body"><span class="book-code">Mã: ${esc(book.id)}</span><h3 class="book-title">${book.title}</h3></div>
    </a>
  </article>`;
}

function renderPublicBooks(resetPage = true) {
  if (resetPage) catalogPage = 1;
  const books = db.bookTitles.filter(book => book.showOnWeb);
  const query = normalizeSearch(document.getElementById('publicBookSearch').value);
  const category = esc(document.getElementById('publicCategoryFilter').value);
  const status = document.getElementById('publicStatusFilter').value;
  const filtered = books.filter(book => {
    const available = getBookCounts(book.id).available > 0;
    return (category === 'ALL' || book.category === category)
      && (status === 'ALL' || status === (available ? 'available' : 'borrowed'))
      && normalizeSearch(decodeHtml(`${book.id} ${book.title} ${book.author} ${book.category}`)).includes(query);
  });
  document.getElementById('pubStatTitles').textContent = books.length;
  document.getElementById('pubStatAvailable').textContent = books.reduce((sum, book) => sum + getBookCounts(book.id).available, 0);
  const pageSize = 10;
  const pages = Math.ceil(filtered.length / pageSize);
  catalogPage = Math.min(catalogPage, Math.max(1, pages));
  document.getElementById('publicBookGrid').innerHTML = filtered.slice((catalogPage - 1) * pageSize, catalogPage * pageSize).map(bookCard).join('')
    || '<p class="library-empty">Chưa tìm thấy sách phù hợp.</p>';
  const pagination = document.getElementById('catalogPagination');
  pagination.replaceChildren();
  if (pages > 1) {
    const addPageButton = (label, page, disabled) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = disabled;
      button.onclick = () => { catalogPage = page; renderPublicBooks(false); scrollToElement('inventory'); };
      pagination.append(button);
    };
    addPageButton('← Trước', catalogPage - 1, catalogPage === 1);
    const label = document.createElement('span');
    label.textContent = `Trang ${catalogPage} / ${pages}`;
    label.setAttribute('aria-live', 'polite');
    pagination.append(label);
    addPageButton('Sau →', catalogPage + 1, catalogPage === pages);
  }
  document.getElementById('featuredBooks').innerHTML = books.slice(0, 4).map(bookCard).join('')
    || '<p class="library-empty">Danh mục sách đang được cập nhật.</p>';
  document.getElementById('libraryHeroBooks').innerHTML = books.slice(0, 3).map(book =>
    `<a href="${esc(bookUrl(book))}" aria-label="${book.title}">${bookCover(book)}</a>`).join('')
    || '<div class="library-hero-placeholder" aria-hidden="true"><span></span><span></span><span></span></div>';
}

function renderBookDetail(code) {
  const detail = document.getElementById('publicBookDetail');
  const book = db.bookTitles.find(item => item.showOnWeb && item.id === code);
  if (!book) {
    detail.innerHTML = '<p class="library-empty">Sách này hiện không có trong danh mục công khai.</p>';
    return;
  }
  const available = getBookCounts(book.id).available;
  detail.innerHTML = `<div class="library-book-heading">
    <div class="library-detail-cover">${bookCover(book)}</div>
    <div>
      <span class="book-code">Mã: ${esc(book.id)}</span>
      <h1>${book.title}</h1>
      <p class="library-book-author">${book.author || 'Chưa cập nhật tác giả'}</p>
      <p class="library-detail-stock">Số lượng tồn: ${String(available).padStart(2, '0')}</p>
      <button class="btn btn-primary" id="detailBorrowBtn">${available ? 'Đăng ký mượn sách' : 'Nhận thông báo khi có sách'}</button>
    </div>
  </div>
  <div class="library-book-info">
    <section><h2>Nội dung sách</h2><p>${book.description || book.short_desc || 'Nội dung đang được cập nhật.'}</p></section>
    <dl><dt>Thể loại</dt><dd>${book.category || 'Chưa cập nhật'}</dd>
    <dt>Nhà xuất bản</dt><dd>${book.publisher || 'Chưa cập nhật'}</dd>
    <dt>Ngôn ngữ</dt><dd>${book.language || 'Chưa cập nhật'}</dd></dl>
  </div>`;
  document.getElementById('detailBorrowBtn').onclick = () => openBorrowModal(book.id);
}
function openBorrowModal(bookId) {
  const book = db.bookTitles.find(b => b.id === bookId);
  if (!book) return;
  activeBorrowBook = book;

  trackEvent('click_borrow_book_btn', { bookId: book.id, code: book.code, title: book.title });

  const titleEl = document.getElementById('modalBookTitle');
  if (titleEl) titleEl.textContent = book.title;

  const copyBtn = document.getElementById('btnCopyBorrowText');
  if (copyBtn) {
    copyBtn.innerHTML = '📋 Sao Chép Đoạn Văn';
    copyBtn.classList.remove('btn-secondary');
    copyBtn.classList.add('btn-primary');
  }

  updateBorrowTemplateText();
  openModal('borrowModal');
}

function updateBorrowTemplateText() {
  if (!activeBorrowBook) return;
  const counts = getBookCounts(activeBorrowBook.id);
  const stockStatus = counts.available > 0
    ? `Còn sách sẵn sàng (SL: ${counts.available})`
    : 'Hiện chưa có cuốn sẵn sàng - Liên hệ để được thông báo';

  const name = document.getElementById('borrowUserName')?.value || '';
  const phone = document.getElementById('borrowUserPhone')?.value || '';
  const spa = document.getElementById('borrowUserSpa')?.value || '';
  const type = document.getElementById('borrowUserType')?.value || '(Khách hàng công ty / KTV / Khách mới)';

  // Đúng cấu trúc mẫu văn bản trong Đặc tả (Gemini).md mục II.3
  const message =
`Chào Quản trị viên Thư viện Spa, tôi muốn đăng ký mượn cuốn sách này:
- Sách: ${activeBorrowBook.title}
- Mã sách: ${activeBorrowBook.code} (${activeBorrowBook.id})
- Trạng thái kho: ${stockStatus}
- Họ và tên: ${name}
- SĐT: ${phone}
- Cơ sở / Spa: ${spa}
- Phân loại: ${type}`;

  const textarea = document.getElementById('borrowMessageTextarea');
  if (textarea) textarea.value = message;
}

function handleCopyBorrowText() {
  const textarea = document.getElementById('borrowMessageTextarea');
  if (!textarea) return;
  copyTextToClipboard(textarea.value);
  trackEvent('copy_book_info', { bookId: activeBorrowBook?.id });

  const btn = document.getElementById('btnCopyBorrowText');
  if (btn) {
    btn.innerHTML = '✅ Đã Sao Chép! (Tick xanh)';
  }
  showToast('Đã sao chép nội dung đăng ký mượn sách vào Clipboard!');
}

function handleOpenZaloFromModal() {
  const textarea = document.getElementById('borrowMessageTextarea');
  const text = textarea ? textarea.value : '';
  openZaloWithTemplate(text);
}

function openZaloOA() {
  trackEvent('redirect_zalo_oa', { source: 'direct_button' });
  const baseUrl = db.settings.zaloOaId || 'https://zalo.me/lamourspalibrary';
  window.open(baseUrl, '_blank', 'noopener');
}

function openZaloWithTemplate(sampleText) {
  if (sampleText) {
    copyTextToClipboard(sampleText);
  }
  trackEvent('redirect_zalo_oa', { text: sampleText });
  const baseUrl = db.settings.zaloOaId || 'https://zalo.me/lamourspalibrary';
  const url = `${baseUrl}?text=${encodeURIComponent(sampleText || '')}`;
  showToast('Đã sao chép tin nhắn mẫu & đang mở Zalo OA...');
  window.open(url, '_blank', 'noopener');
}

function copyTextValue(text, btnEl) {
  copyTextToClipboard(text);
  if (btnEl) {
    btnEl.textContent = '✓ Đã sao chép!';
  }
  showToast('Đã sao chép văn bản mẫu vào Clipboard!');
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const temp = document.createElement('textarea');
  temp.value = text;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
}

/* ==========================================================================
   PAGE 02: ISOV KOREA STANDARD SPA INTERACTIVE TABS & GALLERY
   ========================================================================== */
const ISOV_TIERS = {
  standard: {
    badge: 'Hạng Tiêu Chuẩn (Standard)',
    title: 'Khởi Đầu Chuẩn Hóa Quy Trình Trị Liệu Hàn Quốc',
    input: [
      'Cơ sở có tối thiểu 02 giường trị liệu tiêu chuẩn.',
      'Ứng dụng nhóm sản phẩm cơ bản chính hãng ISOV Korea.',
      'Cam kết tuân thủ quy trình vệ sinh trị liệu.'
    ],
    output: [
      'Cấp chứng nhận đối tác chuẩn ISOV cơ bản.',
      'Chuyển giao bộ Slide đào tạo phác đồ chuẩn Hàn Quốc.',
      'Hỗ trợ bộ tài liệu truyền thông & hình ảnh trên mạng xã hội.'
    ]
  },
  gold: {
    badge: 'Hạng Nâng Cao (Gold)',
    title: 'Nâng Cấp Đồng Bộ Nhận Diện & Đào Tạo Trực Tiếp Tại Spa',
    input: [
      'Phòng trị liệu đạt chuẩn vô trùng thẩm mỹ.',
      'Đội ngũ KTV đạt chứng chỉ đào tạo chính thức từ nhãn hàng.',
      'Đạt định mức nhập hàng duy trì hàng tháng.'
    ],
    output: [
      'Tài trợ bộ biển bảng nhận diện "ISOV Standard Spa".',
      'Dược sĩ chuyên môn trực tiếp đào tạo kỹ thuật tại Spa.',
      'Ưu tiên nhận mẫu thử và phác đồ liệu trình mới nhất.'
    ]
  },
  diamond: {
    badge: 'Hạng Độc Quyền (Diamond)',
    title: 'Bảo Hộ Thương Quyền Khu Vực & Đào Tạo Quốc Tế Tại Hàn Quốc',
    input: [
      'Quy mô Viện thẩm mỹ / Phòng khám da liễu (Clinic).',
      'Đồng bộ 100% quy trình trị liệu chuẩn ISOV.',
      'Cam kết doanh số chiến lược theo năm.'
    ],
    output: [
      'Bảo hộ thương quyền đối tác theo khu vực địa lý.',
      'Tham gia hội thảo khoa học & tu nghiệp trực tiếp tại Hàn Quốc.',
      'Tư vấn trực tiếp chiến lược kinh doanh & vận hành 1-1.'
    ]
  }
};

function switchIsovTier(tierKey, btnEl) {
  if (btnEl) {
    document.querySelectorAll('.tier-tab').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  const tier = ISOV_TIERS[tierKey] || ISOV_TIERS.standard;
  const box = document.getElementById('isovTierDisplay');
  if (!box) return;

  box.innerHTML = `
    <div class="tier-card-highlight">
      <div>
        <span class="pill pill-emerald">${tier.badge}</span>
        <h3 style="margin: 10px 0; color: var(--primary);">${tier.title}</h3>
        <h4 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">ĐIỀU KIỆN TỐI THIỂU (INPUT):</h4>
        <ul>
          ${tier.input.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>
      <div>
        <span class="pill pill-gold">QUYỀN LỢI CHUYỂN GIAO (OUTPUT)</span>
        <ul style="margin-top: 14px;">
          ${tier.output.map(o => `<li style="margin-bottom:8px;"><strong>✓</strong> ${o}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

const ISOV_GALLERY_DATA = {
  '2024': {
    driveUrl: 'https://drive.google.com/drive/folders/isov-2024',
    items: [
      { title: 'Lễ Ký Kết 25 Chủ Spa Tiên Phong ISOV 2024', desc: 'Chuyển giao phác đồ điều trị da chuẩn Hàn tại TP.HCM.' },
      { title: 'Nâng Cấp Biển Hiệu Chuẩn ISOV Standard Spa', desc: 'Hình ảnh trước & sau khi chuẩn hóa nhận diện đối tác Quận 1.' },
      { title: 'Khóa Thực Hành Lâm Sàng Cùng Chuyên Gia', desc: 'Đào tạo chuẩn hóa thao tác KTV khóa mùa thu 2024.' },
      { title: 'Trao Chứng Nhận Đối Tác Hạng Gold 2024', desc: 'Vinh danh các cơ sở đạt chuẩn vô trùng và hiệu quả lâm sàng.' },
      { title: 'Hội Thảo Khoa Học Da Liễu ISOV Seoul', desc: 'Đoàn chủ Spa Việt Nam tham quan nhà máy tại Hàn Quốc.' },
      { title: 'Kiểm Định Chất Lượng Phòng Trị Liệu', desc: 'Đội ngũ dược sĩ thẩm định thực tế tại các cơ sở đối tác.' }
    ]
  },
  '2025': {
    driveUrl: 'https://drive.google.com/drive/folders/isov-2025',
    items: [
      { title: 'Hội Nghị Thượng Đỉnh ISOV Korea Standard 2025', desc: 'Quy tụ hơn 120 chủ Spa & Clinic trên toàn quốc.' },
      { title: 'Lễ Bàn Giao Bộ Nhận Diện Diamond Clinic', desc: 'Đồng bộ không gian trải nghiệm khách hàng chuẩn Seoul.' },
      { title: 'Chuyển Giao Phác Đồ Meso & Peel Sinh Học', desc: 'Cập nhật công nghệ phục hồi hàng rào bảo vệ da thế hệ mới.' },
      { title: 'Đào Tạo Nội Bộ 1-1 Tại Cơ Sở Đối Tác', desc: 'Dược sĩ ISOV trực tiếp cầm tay chỉ việc cho đội ngũ KTV.' },
      { title: 'Lễ Trao Bằng Tốt Nghiệp KTV Chuẩn Hàn 2025', desc: '100% học viên vượt qua kỳ sát hạch lý thuyết và thực hành.' },
      { title: 'Gala Vinh Danh Đối Tác Xuất Sắc Năm 2025', desc: 'Tăng trưởng doanh thu bền vững cùng hệ sinh thái Lamour.' }
    ]
  },
  '2026': {
    driveUrl: 'https://drive.google.com/drive/folders/isov-2026',
    items: [
      { title: 'Lễ Ký Kết Chiến Lược ISOV Standard Spa 2026', desc: 'Mở rộng mạng lưới bảo chứng chất lượng toàn diện.' },
      { title: 'Ra Mắt Thư Viện Sách & Cổng Dữ Liệu Lamour 2026', desc: 'Chuẩn hóa tri thức chuyên ngành cho toàn bộ chủ Spa & KTV.' },
      { title: 'Trước & Sau Chuẩn Hóa Không Gian Trị Liệu 2026', desc: 'Nâng cấp toàn diện khu vực tư vấn soi da và phòng VIP.' },
      { title: 'Chuyến Tu Nghiệp Chuyên Sâu Seoul Mùa Xuân 2026', desc: 'Cập nhật xu hướng thẩm mỹ nội khoa Hàn Quốc mới nhất.' },
      { title: 'Chương Trình Thẩm Định & Cấp Biển Bảng Đợt 1/2026', desc: '30 cơ sở mới chính thức đạt chuẩn ISOV Korea Standard.' },
      { title: 'Workshop Quản Trị Doanh Thu Mô Hình 100 Triệu', desc: 'Ứng dụng đồng bộ phác đồ điều trị và quy trình tư vấn.' }
    ]
  }
};

function switchGalleryYear(year, btnEl) {
  if (btnEl) {
    document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  const data = ISOV_GALLERY_DATA[year] || ISOV_GALLERY_DATA['2026'];
  const grid = document.getElementById('isovGalleryGrid');
  const label = document.getElementById('isovYearLabel');
  const link = document.getElementById('isovDriveYearLink');

  if (label) label.textContent = `Năm ${year}`;
  if (link) link.href = data.driveUrl;

  if (grid) {
    grid.innerHTML = data.items.map((item, idx) => `
      <div class="gallery-item">
        <div class="gallery-thumb">
          <span class="gallery-year-tag">ISOV ${year} • Ảnh #0${idx + 1}</span>
          <strong>${item.title}</strong>
        </div>
        <div class="gallery-caption">${item.desc}</div>
      </div>
    `).join('');
  }
}

/* ==========================================================================
   PAGE 04: INSTANT LOGIN (Chưa cần xác thực - Ấn nút Login là vào hệ thống)
   ========================================================================== */
// handleInstantLogin: implemented in live.js

// handleLogout: implemented in live.js

function switchAdminTab(tabKey, syncUrl = true) {
  document.querySelectorAll('.sidebar-nav .side-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
  });
  document.querySelectorAll('.admin-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `admin-tab-${tabKey}`);
  });

  const titles = {
    dashboard: ['Tổng Quan Hệ Thống Thư Viện', 'Theo dõi thời gian thực số lượng sách, phiếu mượn, cảnh báo nhắc hạn 1 tháng và quỹ tiền cọc'],
    books: ['Quản Lý Đầu Sách & Bản Sao Từng Cuốn', 'Số lượng tự đếm từ bảng Bản sao (DSxxx-001). Không xóa sách mất/hư để giữ lịch sử'],
    loans: ['Phiếu Mượn – Trả – Thu Hồi & Bồi Thường', 'Khách Lamour: 12 tháng / 0đ cọc | Khách vãng lai: 03 tháng / 500.000đ cọc | Phí trễ: 5.000đ/ngày'],
    readers: ['Hồ Sơ Độc Giả (Định Danh Số Điện Thoại)', 'Tra cứu lịch sử mượn, trạng thái quá hạn và số tiền cọc đang giữ của từng khách'],
    wallets: ['Quản Lý Ví Thanh Toán & Sổ Hoạt Động', 'Đối soát tiền cọc (Momo, Ngân hàng, Tiền mặt) và khấu trừ phí trễ / bồi thường'],
    print: ['Mẫu Phiếu In Chuẩn Khổ A4 (Xuất PDF)', 'Xem trước và in Phiếu Mượn Sách hoặc Phiếu Trả & Đối Soát Cọc tại quầy'],
    settings: ['Cài Đặt Chính Sách & Nhật Ký Hệ Thống (Log)', 'Mọi điều chỉnh tiền cọc, phí phạt và bồi thường đều được lưu vết trong Audit Log']
  };

  const t = titles[tabKey] || titles.dashboard;
  document.getElementById('adminTabTitle').textContent = t[0];
  document.getElementById('adminTabSubtitle').textContent = t[1];

  renderAllAdminViews();
  document.querySelector('.admin-sidebar')?.classList.remove('open');
  if (syncUrl && document.getElementById('page-admin')?.classList.contains('active')) {
    window.history.replaceState(null, '', `#/admin/${tabKey}`);
  }
}

function toggleAdminSidebar() {
  document.querySelector('.admin-sidebar')?.classList.toggle('open');
}

function renderAllAdminViews() {
  renderAdminDashboard();
  renderAdminBooks();
  renderAdminLoans();
  renderAdminReaders();
  renderAdminWallets();
  renderPrintPreviewSelect();
  renderPrintPreview();
  renderAdminSettingsAndLogs();
  renderPublicBooks();
}

function renderAdminDashboard() {
  const kpiGrid = document.getElementById('adminKpiGrid');
  if (!kpiGrid) return;

  let totalCopies = 0, availCopies = 0, borrowedCopies = 0, repairCopies = 0;
  db.bookTitles.forEach(b => {
    const c = getBookCounts(b.id);
    totalCopies += c.total;
    availCopies += c.available;
    borrowedCopies += c.borrowed;
    repairCopies += c.repairing;
  });

  const activeLoans = db.loans.filter(l => l.status === 'Đang mượn').length;
  const overdueLoans = db.loans.filter(l => l.status === 'Quá hạn').length;
  const totalDepositHeld = db.loans
    .filter(l => l.status !== 'Đã trả – Đã xử lý')
    .reduce((sum, l) => sum + (Number(l.depositHeld) || 0), 0);

  const totalPenaltyCollected = db.activities
    .filter(a => ['Trừ cọc', 'Phạt trễ', 'Phạt hư hại', 'Đền mất'].includes(a.type))
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  kpiGrid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Số Đầu Sách / Tổng Cuốn</div>
      <div class="kpi-value">${db.bookTitles.length} / ${totalCopies}</div>
      <div class="kpi-sub">Sẵn sàng: ${availCopies} • Đang mượn: ${borrowedCopies} • Đang sửa: ${repairCopies}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tổng Hồ Sơ Độc Giả</div>
      <div class="kpi-value">${db.readers.length}</div>
      <div class="kpi-sub">Định danh chính bằng SĐT</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Phiếu Đang Mượn / Quá Hạn</div>
      <div class="kpi-value">${activeLoans} / <span style="color:var(--danger)">${overdueLoans}</span></div>
      <div class="kpi-sub">Nhắc hạn trước 01 tháng</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tổng Tiền Cọc Đang Giữ</div>
      <div class="kpi-value">${formatCurrency(totalDepositHeld)}</div>
      <div class="kpi-sub">500.000đ / cuốn (Khách vãng lai)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tổng Phạt / Bồi Thường Đã Thu</div>
      <div class="kpi-value">${formatCurrency(totalPenaltyCollected)}</div>
      <div class="kpi-sub">Gồm cả khấu trừ vào tiền cọc</div>
    </div>
  `;

  // Render Wallets summary
  const walletBody = document.getElementById('dashboardWalletBody');
  if (walletBody) {
    walletBody.innerHTML = db.wallets.map(w => {
      const st = getWalletStats(w.name);
      return `
        <tr>
          <td><strong>${w.id}</strong></td>
          <td>${w.name} <span class="text-muted">(${w.type})</span></td>
          <td><strong>${formatCurrency(st.balance)}</strong></td>
          <td><span class="badge badge-info">${formatCurrency(st.depositHeld)}</span></td>
          <td><span class="badge badge-success">${w.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Render Alerts (Overdue + Reminder 1 month before)
  const alertsBox = document.getElementById('dashboardAlertsList');
  if (alertsBox) {
    const openLoans = db.loans.filter(l => l.status !== 'Đã trả – Đã xử lý');
    if (openLoans.length === 0) {
      alertsBox.innerHTML = `<div class="text-muted">Không có phiếu quá hạn hoặc cần nhắc hạn.</div>`;
    } else {
      alertsBox.innerHTML = openLoans.map(l => {
        const reader = db.readers.find(r => r.id === l.readerId);
        const book = db.bookTitles.find(b => b.id === l.bookId);
        const isOverdue = l.status === 'Quá hạn';
        return `
          <div class="alert-item ${isOverdue ? 'overdue' : ''}">
            <div>
              <strong>${isOverdue ? '🚨 QUÁ HẠN THU HỒI:' : '🔔 LỊCH NHẮC TRƯỚC 1 THÁNG:'} [${l.id}] ${reader ? reader.name : l.readerId} (${reader ? reader.phone : ''})</strong>
              <div>Sách: ${book ? book.title : l.copyId} • Hạn trả: <b>${l.dueDate}</b> (Ngày nhắc: ${l.remindDate})</div>
            </div>
            <button class="btn btn-xs btn-primary" onclick="openReturnModal('${l.id}')">Xử lý trả / Thu hồi</button>
          </div>
        `;
      }).join('');
    }
  }
}

function renderAdminBooks() {
  const tbody = document.getElementById('adminBooksTableBody');
  const copiesBody = document.getElementById('adminCopiesTableBody');
  if (!tbody || !copiesBody) return;

  const q = normalizeSearch(document.getElementById('adminBookSearch')?.value);
  const categoryFilter = document.getElementById('adminBookCategoryFilter');
  const selectedCategory = esc(categoryFilter?.value || 'ALL');
  if (categoryFilter) {
    const categories = [...new Set(db.bookTitles.map(b => b.category).filter(Boolean))].sort();
    categoryFilter.innerHTML = `<option value="ALL">Tất cả chuyên mục</option>${categories.map(category => `<option value="${category}">${category}</option>`).join('')}`;
    categoryFilter.value = categories.includes(selectedCategory) ? decodeHtml(selectedCategory) : 'ALL';
  }
  const category = esc(categoryFilter?.value || 'ALL');
  const availability = document.getElementById('adminBookAvailabilityFilter')?.value || 'ALL';

  const filteredTitles = db.bookTitles.filter(b => {
    const counts = getBookCounts(b.id);
    const matchesQuery = !q || normalizeSearch(`${b.id} ${b.code} ${b.title} ${b.author} ${b.category}`).includes(q);
    const matchesCategory = category === 'ALL' || b.category === category;
    const matchesAvailability = availability === 'ALL'
      || (availability === 'AVAILABLE' && counts.available > 0)
      || (availability === 'UNAVAILABLE' && counts.available === 0)
      || (availability === 'WEB' && b.showOnWeb);
    return matchesQuery && matchesCategory && matchesAvailability;
  });

  setText('adminBookResultCount', `${filteredTitles.length} đầu sách`);

  tbody.innerHTML = filteredTitles.length ? filteredTitles.map(b => {
    const c = getBookCounts(b.id);
    return `
      <tr>
        <td><strong>${b.id}</strong><br><small class="text-muted">${b.code}</small></td>
        <td>
          <strong>${b.title}</strong><br>
          <small class="text-muted">${b.publishStatus} • ${b.pages} trang</small>
        </td>
        <td>${b.author}</td>
        <td>${b.category}</td>
        <td>${formatCurrency(b.price)}</td>
        <td><strong>${c.total}</strong></td>
        <td><span class="badge badge-success">${c.available}</span></td>
        <td><span class="badge badge-warning">${c.borrowed}</span></td>
        <td><span class="badge badge-info">${c.repairing}</span></td>
        <td>
          <input type="checkbox" ${b.showOnWeb ? 'checked' : ''} onchange="toggleBookWebVisibility('${b.id}', this.checked)" />
        </td>
        <td>
          <button class="btn btn-outline btn-xs" onclick="addQuickCopy('${b.id}')">+1 Bản sao</button>
        </td>
      </tr>
    `;
  }).join('') : emptyTableRow(11, 'Không tìm thấy đầu sách', 'Thử đổi từ khóa hoặc xóa bớt bộ lọc.');

  const copyQuery = normalizeSearch(document.getElementById('adminCopySearch')?.value);
  const copyStatus = document.getElementById('adminCopyStatusFilter')?.value || 'ALL';
  const copyCondition = document.getElementById('adminCopyConditionFilter')?.value || 'ALL';
  const filteredCopies = db.bookCopies.filter(cp => {
    const titleObj = db.bookTitles.find(b => b.id === cp.bookId);
    const matchesQuery = !copyQuery || normalizeSearch(`${cp.copyId} ${cp.bookId} ${titleObj?.title || ''} ${cp.shelf} ${cp.note}`).includes(copyQuery);
    return matchesQuery && (copyStatus === 'ALL' || cp.status === copyStatus) && (copyCondition === 'ALL' || cp.condition === copyCondition);
  });
  setText('adminCopyResultCount', `${filteredCopies.length} cuốn`);

  copiesBody.innerHTML = filteredCopies.length ? filteredCopies.map(cp => {
    const titleObj = db.bookTitles.find(b => b.id === cp.bookId);
    const badgeCls = cp.status === 'Có sẵn' ? 'badge-success' : (cp.status === 'Đang mượn' ? 'badge-warning' : 'badge-danger');
    return `
      <tr>
        <td><strong>${cp.copyId}</strong></td>
        <td>${cp.bookId}</td>
        <td>${titleObj ? titleObj.title : ''}</td>
        <td>${cp.condition}</td>
        <td><span class="badge ${badgeCls}">${cp.status}</span></td>
        <td>${cp.shelf}</td>
        <td>${cp.note || '—'}</td>
        <td>
          <select class="input-sm" style="min-width:130px;padding:4px 8px !important;" onchange="changeCopyStatus('${cp.copyId}', this.value)">
            <option value="Có sẵn" ${cp.status === 'Có sẵn' ? 'selected' : ''}>Có sẵn</option>
            <option value="Đang mượn" ${cp.status === 'Đang mượn' ? 'selected' : ''}>Đang mượn</option>
            <option value="Đang sửa" ${cp.status === 'Đang sửa' ? 'selected' : ''}>Đang sửa</option>
            <option value="Mất" ${cp.status === 'Mất' ? 'selected' : ''}>Mất</option>
            <option value="Thanh lý" ${cp.status === 'Thanh lý' ? 'selected' : ''}>Thanh lý</option>
          </select>
        </td>
      </tr>
    `;
  }).join('') : emptyTableRow(8, 'Không tìm thấy cuốn sách', 'Kiểm tra mã cuốn, vị trí kệ hoặc bộ lọc trạng thái.');
}

function clearBookFilters() {
  const search = document.getElementById('adminBookSearch');
  const category = document.getElementById('adminBookCategoryFilter');
  const availability = document.getElementById('adminBookAvailabilityFilter');
  if (search) search.value = '';
  if (category) category.value = 'ALL';
  if (availability) availability.value = 'ALL';
  renderAdminBooks();
}

function clearCopyFilters() {
  const search = document.getElementById('adminCopySearch');
  const status = document.getElementById('adminCopyStatusFilter');
  const condition = document.getElementById('adminCopyConditionFilter');
  if (search) search.value = '';
  if (status) status.value = 'ALL';
  if (condition) condition.value = 'ALL';
  renderAdminBooks();
}

// toggleBookWebVisibility: implemented in live.js

// addQuickCopy: implemented in live.js

// changeCopyStatus: implemented in live.js

function openNewBookModal() {
  openModal('newBookModal');
}

// openNewCopyModal: implemented in live.js

// submitNewBook: implemented in live.js

// renderAdminLoans: implemented in live.js

function setLoanQuickFilter(status) {
  const filter = document.getElementById('adminLoanFilter');
  if (filter) filter.value = status;
  renderAdminLoans();
}

function clearLoanFilters() {
  const ids = ['adminLoanSearch', 'adminLoanFilter', 'adminLoanReaderTypeFilter', 'adminLoanTimeFilter'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'adminLoanSearch' ? '' : 'ALL';
  });
  renderAdminLoans();
}

// addMonthsToDateStr: implemented in live.js

// openNewLoanModal: implemented in live.js

// onLoanReaderChange: implemented in live.js

// submitNewLoan: implemented in live.js

// openReturnModal: implemented in live.js

// recalculateReturnSettlement: implemented in live.js

// submitReturnLoan: implemented in live.js

function renderAdminReaders() {
  const tbody = document.getElementById('adminReadersTableBody');
  if (!tbody) return;
  const q = normalizeSearch(document.getElementById('adminReaderSearch')?.value);
  const typeFilter = document.getElementById('adminReaderTypeFilter')?.value || 'ALL';
  const loanFilter = document.getElementById('adminReaderLoanFilter')?.value || 'ALL';

  const list = db.readers.filter(r => {
    const activeLoans = db.loans.filter(l => l.readerId === r.id && l.status !== 'Đã trả – Đã xử lý');
    const hasOverdue = activeLoans.some(l => l.status === 'Quá hạn');
    const matchesLoan = loanFilter === 'ALL'
      || (loanFilter === 'BORROWING' && activeLoans.length > 0)
      || (loanFilter === 'OVERDUE' && hasOverdue)
      || (loanFilter === 'NO_LOAN' && activeLoans.length === 0);
    return (!q || normalizeSearch(`${r.id} ${r.name} ${r.phone} ${r.address} ${r.note}`).includes(q))
      && (typeFilter === 'ALL' || r.type === typeFilter)
      && matchesLoan;
  });

  setText('adminReaderResultCount', `${list.length} độc giả`);

  tbody.innerHTML = list.length ? list.map(r => {
    const activeLoans = db.loans.filter(l => l.readerId === r.id && l.status !== 'Đã trả – Đã xử lý');
    const booksCount = activeLoans.length;
    const depositHeld = activeLoans.reduce((s, l) => s + (Number(l.depositHeld) || 0), 0);
    return `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td><strong>${r.name}</strong></td>
        <td><span class="book-code">${r.phone}</span></td>
        <td>${r.type}</td>
        <td>${r.address}</td>
        <td><strong>${booksCount} cuốn</strong></td>
        <td><strong>${formatCurrency(depositHeld)}</strong></td>
        <td><span class="badge badge-success">${r.status}</span></td>
        <td>${r.note || '—'}</td>
      </tr>
    `;
  }).join('') : emptyTableRow(9, 'Không tìm thấy độc giả', 'Thử nhập tên, số điện thoại, mã độc giả hoặc cơ sở.');
}

function clearReaderFilters() {
  const search = document.getElementById('adminReaderSearch');
  const type = document.getElementById('adminReaderTypeFilter');
  const loan = document.getElementById('adminReaderLoanFilter');
  if (search) search.value = '';
  if (type) type.value = 'ALL';
  if (loan) loan.value = 'ALL';
  renderAdminReaders();
}

function openNewReaderModal() {
  openModal('newReaderModal');
}

// submitNewReader: implemented in live.js

function renderAdminWallets() {
  const wBody = document.getElementById('adminWalletsTableBody');
  const aBody = document.getElementById('adminActivitiesTableBody');
  if (wBody) {
    wBody.innerHTML = db.wallets.map(w => {
      const st = getWalletStats(w.name);
      return `
        <tr>
          <td><strong>${w.id}</strong></td>
          <td><strong>${w.name}</strong></td>
          <td>${w.type}</td>
          <td>${w.account}</td>
          <td>${formatCurrency(w.initialBalance)}</td>
          <td><strong>${formatCurrency(st.balance)}</strong></td>
          <td><span class="badge badge-info">${formatCurrency(st.depositHeld)}</span></td>
          <td><span class="badge badge-success">${w.status}</span></td>
        </tr>
      `;
    }).join('');
  }
  if (aBody) {
    const walletFilter = document.getElementById('adminActivityWalletFilter');
    const selectedWallet = walletFilter?.value || 'ALL';
    if (walletFilter) {
      walletFilter.innerHTML = `<option value="ALL">Tất cả ví</option>${db.wallets.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}`;
      walletFilter.value = db.wallets.some(w => w.name === selectedWallet) ? selectedWallet : 'ALL';
    }
    const q = normalizeSearch(document.getElementById('adminActivitySearch')?.value);
    const type = document.getElementById('adminActivityTypeFilter')?.value || 'ALL';
    const wallet = walletFilter?.value || 'ALL';
    const activities = db.activities.filter(a => {
      const haystack = normalizeSearch(`${a.id} ${a.readerId} ${a.loanId} ${a.type} ${a.wallet} ${a.staff} ${a.note}`);
      return (!q || haystack.includes(q)) && (type === 'ALL' || a.type === type) && (wallet === 'ALL' || a.wallet === wallet);
    });
    setText('adminActivityResultCount', `${activities.length} giao dịch`);
    aBody.innerHTML = activities.length ? activities.map(a => `
      <tr>
        <td><strong>${a.id}</strong></td>
        <td>${a.time}</td>
        <td>${a.readerId}</td>
        <td><strong>${a.loanId}</strong></td>
        <td><span class="badge badge-info">${a.type}</span></td>
        <td><strong>${formatCurrency(a.amount)}</strong></td>
        <td>${a.wallet}</td>
        <td>${a.depositEffect}</td>
        <td>${a.walletEffect}</td>
        <td>${a.staff}</td>
        <td>${a.note}</td>
      </tr>
    `).join('') : emptyTableRow(11, 'Không tìm thấy giao dịch', 'Thử tìm theo mã giao dịch, mã phiếu, độc giả hoặc đổi bộ lọc.');
  }
}

function clearActivityFilters() {
  const search = document.getElementById('adminActivitySearch');
  const type = document.getElementById('adminActivityTypeFilter');
  const wallet = document.getElementById('adminActivityWalletFilter');
  if (search) search.value = '';
  if (type) type.value = 'ALL';
  if (wallet) wallet.value = 'ALL';
  renderAdminWallets();
}

/* ==========================================================================
   TAB 6: MẪU PHIẾU IN KHỔ A4 (PHIẾU MƯỢN / PHIẾU TRẢ)
   ========================================================================== */
// renderPrintPreviewSelect: implemented in live.js

function previewLoanInPrintTab(loanId) {
  switchAdminTab('print');
  const sel = document.getElementById('printLoanSelect');
  if (sel) {
    sel.value = loanId;
    renderPrintPreview();
  }
}

// renderPrintPreview: implemented in live.js

function renderAdminSettingsAndLogs() {
  const s = db.settings;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('cfgLibraryName', s.libraryName);
  setVal('cfgAddress', s.address);
  setVal('cfgHotline', s.hotline);
  setVal('cfgZaloOa', s.zaloOaId);
  setVal('cfgLamourMonths', s.lamourLoanMonths);
  setVal('cfgGuestMonths', s.guestLoanMonths);
  setVal('cfgDepositAmount', s.guestDepositAmount);
  setVal('cfgLateFeePerDay', s.lateFeePerDay);
  setVal('cfgTechFee', s.techFeeLostBook);
  setVal('cfgOutPrintMultiplier', s.outOfPrintMultiplier);

  const logBody = document.getElementById('adminLogsTableBody');
  if (logBody) {
    logBody.innerHTML = db.logs.map(lg => `
      <tr>
        <td><small>${lg.time}</small></td>
        <td><strong>${lg.actor}</strong></td>
        <td><span class="badge badge-info">${lg.action}</span></td>
        <td><strong>${lg.target}</strong></td>
        <td>${lg.detail}</td>
      </tr>
    `).join('');
  }
}

// saveSettingsForm: implemented in live.js

// addSystemLog: implemented in live.js

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function openRulesModal() {
  openModal('rulesModal');
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'toast-msg';
  div.textContent = message;
  container.appendChild(div);
  setTimeout(() => {
    div.remove();
  }, 3400);
}

function generateQrSvg(label) {
  return `
    <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#ffffff"/>
      <rect x="8" y="8" width="26" height="26" fill="none" stroke="#0f3d33" stroke-width="5"/>
      <rect x="15" y="15" width="12" height="12" fill="#0f3d33"/>
      <rect x="66" y="8" width="26" height="26" fill="none" stroke="#0f3d33" stroke-width="5"/>
      <rect x="73" y="15" width="12" height="12" fill="#0f3d33"/>
      <rect x="8" y="66" width="26" height="26" fill="none" stroke="#0f3d33" stroke-width="5"/>
      <rect x="15" y="73" width="12" height="12" fill="#0f3d33"/>
      <rect x="42" y="12" width="6" height="6" fill="#0f3d33"/>
      <rect x="52" y="18" width="6" height="12" fill="#0f3d33"/>
      <rect x="40" y="38" width="20" height="20" rx="4" fill="#c59b27"/>
      <text x="50" y="51" font-size="8" text-anchor="middle" fill="#fff" font-weight="bold">${label}</text>
      <rect x="14" y="44" width="16" height="6" fill="#0f3d33"/>
      <rect x="68" y="44" width="18" height="6" fill="#0f3d33"/>
      <rect x="44" y="68" width="12" height="6" fill="#0f3d33"/>
      <rect x="64" y="64" width="10" height="10" fill="#0f3d33"/>
      <rect x="80" y="74" width="12" height="16" fill="#0f3d33"/>
      <rect x="44" y="82" width="26" height="8" fill="#0f3d33"/>
    </svg>
  `;
}

// initQrBoxes: implemented in live.js
window.addEventListener('DOMContentLoaded', () => liveInitialize());
