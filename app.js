const people = [
  { id: 'linh', name: 'Linh Trần', initials: 'L', color: 'lavender', preview: 'Tối nay mình đi cà phê nhé? ☕', time: '2 phút', online: true, unread: 2, messages: [{ mine: false, text: 'Mình vừa tìm được một quán mới xinh lắm!' }, { mine: false, text: 'Tối nay mình đi cà phê nhé? ☕', time: '19:42' }] },
  { id: 'team', name: 'Nhóm Sáng tạo', initials: 'S', color: 'coral', preview: 'Minh: Mình gửi bản thiết kế rồi nha', time: '18 phút', online: false, unread: 0, group: true, members: '5 thành viên', messages: [{ mine: false, text: 'Huy: Màu mới nhìn dịu mắt hơn nhiều.' }, { mine: true, text: 'Minh: Mình gửi bản thiết kế rồi nha', time: '19:25' }] },
  { id: 'minh', name: 'Minh Nguyễn', initials: 'M', color: 'mint', preview: 'Cảm ơn bạn nhiều nha!', time: '1 giờ', online: true, unread: 0, messages: [{ mine: false, text: 'Bạn giúp mình vụ hôm qua với nhé?' }, { mine: true, text: 'Được chứ, để mình xem lại nha.' }, { mine: false, text: 'Cảm ơn bạn nhiều nha!', time: '18:40' }] },
  { id: 'an', name: 'An Phạm', initials: 'A', color: 'sky', preview: 'Đã gửi một ảnh', time: '3 giờ', online: false, unread: 1, messages: [{ mine: true, text: 'Cuối tuần bạn có đi đâu không?' }, { mine: false, text: 'Đã gửi một ảnh 📷', time: '16:12' }] },
  { id: 'family', name: 'Nhà mình 🏡', initials: 'N', color: 'peach', preview: 'Mẹ: Nhớ ăn uống đầy đủ nhé con', time: 'Hôm qua', online: false, unread: 0, group: true, members: '4 thành viên', messages: [{ mine: false, text: 'Mẹ: Nhớ ăn uống đầy đủ nhé con', time: 'Hôm qua' }] },
  { id: 'khoa', name: 'Khoa Lê', initials: 'K', color: 'blue', preview: 'Haha chuẩn luôn 😂', time: 'T.2', online: false, unread: 0, messages: [{ mine: false, text: 'Đi sớm để chọn chỗ đẹp nhé.' }, { mine: true, text: 'Haha chuẩn luôn 😂', time: 'T.2' }] }
];

const $ = (selector) => document.querySelector(selector);
const list = $('#conversationList');
let activeId = null;
let activeFilter = 'all';
let searchTerm = '';
let sortNewestFirst = true;
let toastTimer;

function renderList() {
  const filtered = people.filter((person) => {
    const matchesSearch = `${person.name} ${person.preview}`.toLocaleLowerCase('vi').includes(searchTerm);
    const matchesFilter = activeFilter === 'all' || (activeFilter === 'unread' && person.unread > 0) || (activeFilter === 'groups' && person.group);
    return matchesSearch && matchesFilter;
  });
  if (!sortNewestFirst) filtered.reverse();
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-list"><span>⌕</span><strong>Không tìm thấy cuộc trò chuyện</strong><small>Thử một từ khóa khác nhé.</small></div>';
    return;
  }
  list.innerHTML = filtered.map((person) => `
    <button class="conversation ${person.id === activeId ? 'current' : ''}" data-id="${person.id}" role="listitem" aria-label="Mở cuộc trò chuyện với ${person.name}">
      <span class="avatar ${person.color}">${person.initials}${person.online ? '<i class="online-dot"></i>' : ''}</span>
      <span class="conversation-copy"><span class="conversation-top"><strong>${escapeHTML(person.name)}</strong><time>${person.time}</time></span><span class="conversation-bottom"><span>${escapeHTML(person.preview)}</span>${person.unread ? `<i class="unread-count">${person.unread}</i>` : ''}</span></span>
    </button>`).join('');
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function openChat(id) {
  const person = people.find((item) => item.id === id);
  if (!person) return;
  activeId = id;
  person.unread = 0;
  $('#welcomeState').classList.add('hidden');
  $('#activeChat').classList.remove('hidden');
  $('#headerName').textContent = person.name;
  $('#headerAvatar').textContent = person.initials;
  $('#headerAvatar').className = `avatar ${person.color}`;
  $('#headerOnline').style.display = person.online ? '' : 'none';
  $('#headerStatus').textContent = person.group ? person.members : (person.online ? 'Đang hoạt động' : 'Hoạt động gần đây');
  renderMessages(person);
  renderList();
  $('#messageInput').focus({ preventScroll: true });
}

function renderMessages(person) {
  const area = $('#messageArea');
  const body = person.messages.map((message) => `<div class="message-row ${message.mine ? 'mine' : ''}">${!message.mine ? `<span class="mini-avatar ${person.color}">${person.initials}</span>` : ''}<div><div class="message-bubble">${escapeHTML(message.text)}</div>${message.time ? `<time class="message-time">${message.time}</time>` : ''}</div></div>`).join('');
  area.innerHTML = `<div class="day-divider"><span>HÔM NAY</span></div>${body}<div class="typing-indicator hidden" id="typingIndicator"><span class="mini-avatar ${person.color}">${person.initials}</span><span><i></i><i></i><i></i></span></div>`;
  area.scrollTop = area.scrollHeight;
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

list.addEventListener('click', (event) => {
  const item = event.target.closest('.conversation');
  if (item) openChat(item.dataset.id);
});
$('#searchInput').addEventListener('input', (event) => {
  searchTerm = event.target.value.trim().toLocaleLowerCase('vi');
  renderList();
});
document.querySelectorAll('.filter-chip').forEach((button) => button.addEventListener('click', () => {
  document.querySelector('.filter-chip.selected')?.classList.remove('selected');
  button.classList.add('selected');
  activeFilter = button.dataset.filter;
  renderList();
}));
$('#sortButton').addEventListener('click', () => {
  sortNewestFirst = !sortNewestFirst;
  $('#sortButton').innerHTML = `${sortNewestFirst ? 'Mới nhất' : 'Cũ nhất'} <span>⌄</span>`;
  renderList();
});
$('#messageForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#messageInput');
  const text = input.value.trim();
  if (!text || !activeId) return;
  const person = people.find((item) => item.id === activeId);
  person.messages.push({ mine: true, text, time: new Intl.DateTimeFormat('vi', { hour: '2-digit', minute: '2-digit' }).format(new Date()) });
  person.preview = text;
  person.time = 'Vừa xong';
  input.value = '';
  renderMessages(person);
  renderList();
});
$('#themeButton').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('messa-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
if (localStorage.getItem('messa-theme') === 'dark') document.body.classList.add('dark-mode');
$('#composeButton').addEventListener('click', () => showToast('Chọn một cuộc trò chuyện để bắt đầu nhắn tin.'));
$('#welcomeCompose').addEventListener('click', () => openChat('linh'));
$('#emojiButton').addEventListener('click', () => { $('#messageInput').value += ' 😊'; $('#messageInput').focus(); });
$('#attachButton').addEventListener('click', () => showToast('Đính kèm sẽ sớm có mặt trong phiên bản tiếp theo.'));
$('#callButton').addEventListener('click', () => showToast('Cuộc gọi chỉ khả dụng khi kết nối dịch vụ nhắn tin.'));
$('#videoButton').addEventListener('click', () => showToast('Cuộc gọi video chỉ khả dụng khi kết nối dịch vụ nhắn tin.'));
$('#infoButton').addEventListener('click', () => showToast('Messa — trò chuyện gọn nhẹ, tập trung.'));
$('#peopleButton').addEventListener('click', () => showToast('Danh bạ sẽ sớm có mặt.'));
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    $('#searchInput').focus();
  }
  if (event.key === 'Escape') $('#searchInput').blur();
});
renderList();
