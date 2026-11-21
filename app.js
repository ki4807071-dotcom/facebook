const defaultPeople = [
  { id:'linh', name:'Linh Trần', initials:'L', color:'lavender', preview:'Tối nay mình đi cà phê nhé? ☕', time:'2 phút', online:true, unread:2, messages:[{mine:false,text:'Mình vừa tìm được một quán mới xinh lắm!',time:'19:41'},{mine:false,text:'Tối nay mình đi cà phê nhé? ☕',time:'19:42'}]},
  { id:'team', name:'Nhóm Sáng tạo', initials:'S', color:'coral', preview:'Minh: Mình gửi bản thiết kế rồi nha', time:'18 phút', online:false, unread:0, group:true, members:'5 thành viên', messages:[{mine:false,text:'Huy: Màu mới nhìn dịu mắt hơn nhiều.',time:'19:20'},{mine:true,text:'Minh: Mình gửi bản thiết kế rồi nha',time:'19:25'}]},
  { id:'minh', name:'Minh Nguyễn', initials:'M', color:'mint', preview:'Cảm ơn bạn nhiều nha!', time:'1 giờ', online:true, unread:0, messages:[{mine:true,text:'Bạn giúp mình vụ hôm qua với nhé?',time:'18:35'},{mine:false,text:'Cảm ơn bạn nhiều nha!',time:'18:40'}]},
  { id:'an', name:'An Phạm', initials:'A', color:'sky', preview:'Đã gửi một ảnh', time:'3 giờ', online:false, unread:1, messages:[{mine:true,text:'Cuối tuần bạn có đi đâu không?',time:'16:10'},{mine:false,text:'Đã gửi một ảnh 📷',time:'16:12'}]},
  { id:'family', name:'Nhà mình 🏡', initials:'N', color:'peach', preview:'Mẹ: Nhớ ăn uống đầy đủ nhé con', time:'Hôm qua', online:false, unread:0, group:true, members:'4 thành viên', messages:[{mine:false,text:'Mẹ: Nhớ ăn uống đầy đủ nhé con',time:'Hôm qua'}]},
  { id:'khoa', name:'Khoa Lê', initials:'K', color:'blue', preview:'Haha chuẩn luôn 😂', time:'T.2', online:false, unread:0, messages:[{mine:false,text:'Đi sớm để chọn chỗ đẹp nhé.',time:'T.2'},{mine:true,text:'Haha chuẩn luôn 😂',time:'T.2'}]}
];
const $ = (s) => document.querySelector(s);
const list=$('#conversationList');
let people;
try{people=JSON.parse(localStorage.getItem('bbb-chat-v1'))||structuredClone(defaultPeople)}catch{people=structuredClone(defaultPeople)}
let activeId=null,activeFilter='all',searchTerm='',sortNewest=true,toastTimer;
function save(){localStorage.setItem('bbb-chat-v1',JSON.stringify(people))}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function renderList(){
 let filtered=people.filter(p=>(`${p.name} ${p.preview}`.toLocaleLowerCase('vi').includes(searchTerm))&&(activeFilter==='all'||(activeFilter==='unread'&&p.unread>0)||(activeFilter==='groups'&&p.group)));
 if(!sortNewest) filtered=[...filtered].reverse();
 $('#allCount').textContent=people.length;
 if(!filtered.length){list.innerHTML='<div class="empty-list"><span>⌕</span><strong>Không tìm thấy cuộc trò chuyện</strong><small>Thử một từ khóa khác.</small></div>';return}
 list.innerHTML=filtered.map(p=>`<button class="conversation ${p.id===activeId?'current':''}" data-id="${p.id}" role="listitem"><span class="avatar ${p.color}">${esc(p.initials)}${p.online?'<i class="online-dot"></i>':''}</span><span class="conversation-copy"><span class="conversation-top"><strong>${esc(p.name)}</strong><time>${esc(p.time)}</time></span><span class="conversation-bottom"><span>${esc(p.preview)}</span>${p.unread?`<i class="unread-count">${p.unread}</i>`:''}</span></span></button>`).join('');
}
function openChat(id){const p=people.find(x=>x.id===id);if(!p)return;activeId=id;p.unread=0;save();$('#welcomeState').classList.add('hidden');$('#activeChat').classList.remove('hidden');$('#headerName').textContent=p.name;$('#headerAvatar').textContent=p.initials;$('#headerAvatar').className=`avatar ${p.color}`;$('#headerOnline').style.display=p.online?'':'none';$('#headerStatus').textContent=p.group?p.members:(p.online?'Đang hoạt động':'Hoạt động gần đây');renderMessages(p);renderList();$('#messageInput').focus({preventScroll:true})}
function renderMessages(p){const area=$('#messageArea');area.innerHTML=`<div class="day-divider"><span>HÔM NAY</span></div>${p.messages.map(m=>`<div class="message-row ${m.mine?'mine':''}">${!m.mine?`<span class="mini-avatar ${p.color}">${esc(p.initials)}</span>`:''}<div><div class="message-bubble">${esc(m.text)}</div>${m.time?`<time class="message-time">${esc(m.time)}</time>`:''}</div></div>`).join('')}<div class="typing-indicator hidden"><span class="mini-avatar ${p.color}">${esc(p.initials)}</span><span><i></i><i></i><i></i></span></div>`;area.scrollTop=area.scrollHeight}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2400)}
function nowTime(){return new Intl.DateTimeFormat('vi',{hour:'2-digit',minute:'2-digit'}).format(new Date())}
list.addEventListener('click',e=>{const b=e.target.closest('.conversation');if(b)openChat(b.dataset.id)});
$('#searchInput').addEventListener('input',e=>{searchTerm=e.target.value.trim().toLocaleLowerCase('vi');renderList()});
document.querySelectorAll('.filter-chip').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.filter-chip.selected')?.classList.remove('selected');b.classList.add('selected');activeFilter=b.dataset.filter;renderList()}));
$('#sortButton').addEventListener('click',()=>{sortNewest=!sortNewest;$('#sortButton').innerHTML=`${sortNewest?'Mới nhất':'Cũ nhất'} <span>⌄</span>`;renderList()});
$('#messageForm').addEventListener('submit',e=>{e.preventEventDefault?.();e.preventDefault();const input=$('#messageInput'),text=input.value.trim();if(!text||!activeId)return;const p=people.find(x=>x.id===activeId);p.messages.push({mine:true,text,time:nowTime()});p.preview=text;p.time='Vừa xong';input.value='';save();renderMessages(p);renderList();const typing=$('#messageArea .typing-indicator');if(typing){typing.classList.remove('hidden');setTimeout(()=>typing.classList.add('hidden'),1100)}});
$('#themeButton').addEventListener('click',()=>{document.body.classList.toggle('dark-mode');localStorage.setItem('bbb-theme',document.body.classList.contains('dark-mode')?'dark':'light')});
if(localStorage.getItem('bbb-theme')==='dark')document.body.classList.add('dark-mode');
$('#composeButton').addEventListener('click',()=>toast('Chọn hoặc tìm một cuộc trò chuyện bên trái'));
$('#welcomeCompose').addEventListener('click',()=>openChat('linh'));
$('#emojiButton').addEventListener('click',()=>{$('#messageInput').value+=' 😊';$('#messageInput').focus()});
$('#attachButton').addEventListener('click',()=>$('#fileInput').click());
$('#fileInput').addEventListener('change',e=>{const f=e.target.files[0];if(!f||!activeId)return;const p=people.find(x=>x.id===activeId);p.messages.push({mine:true,text:`📎 ${f.name}`,time:nowTime()});p.preview=`📎 ${f.name}`;p.time='Vừa xong';save();renderMessages(p);renderList();e.target.value=''});
$('#callButton').addEventListener('click',()=>toast('Cuộc gọi cần kết nối dịch vụ WebRTC'));
$('#videoButton').addEventListener('click',()=>toast('Gọi video cần kết nối dịch vụ WebRTC'));
$('#infoButton').addEventListener('click',()=>toast('Tài liệu và dữ liệu hội thoại lưu trên thiết bị'));
$('#peopleButton').addEventListener('click',()=>toast('Danh bạ đang dùng dữ liệu hội thoại nội bộ'));
$('#profileButton').addEventListener('click',()=>toast('bimbimbambam · phiên bản giao diện'));
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus()}if(e.key==='Escape')$('#searchInput').blur()});
renderList();
