import {writeFile} from 'node:fs/promises';
const string={type:'string'},uuid={type:'string',format:'uuid'},money={type:'integer',minimum:0},boolean={type:'boolean'};
const endpoints={
 'public/books':{get:['Danh sách sách công khai, chỉ DTO đã lọc']},
 'public/content':{get:['Nội dung và link công khai']},
 'public/events':{post:['Đếm sự kiện tổng hợp, không nhận PII',{event:{enum:['click_borrow_book_btn','copy_book_info','redirect_zalo_oa','click_drive_folder']},target:string},['event']]},
 'auth/login':{post:['Đăng nhập; cookie HttpOnly',{email:string,password:string},['email','password']]},
 'auth/logout':{post:['Thu hồi phiên; xóa cookie',{}]},
 'auth/session':{get:['Kiểm tra phiên và quyền admin']},
 'admin/state':{get:['Dữ liệu quản trị; chỉ admin, gồm bảng nghiệp vụ và snapshot']},
 'admin/book-titles':{post:['Tạo đầu sách và số cuốn ban đầu',{title:string,author:string,category:string,publisher:string,year:{type:['integer','null']},isbn:string,language:string,languageGroup:{enum:['VIETNAMESE','FOREIGN','']},pages:{type:['integer','null'],minimum:1},price:{type:['integer','null'],minimum:0},publishStatus:{enum:['IN_PRINT','OUT_OF_PRINT','UNKNOWN']},coverUrl:string,description:string,copiesCount:{type:'integer',minimum:0,maximum:100},shelf:string,showOnWeb:boolean},['title']]},
 'admin/book-titles/visibility':{post:['Đổi hiển thị web với optimistic version',{id:uuid,version:money,visible:boolean},['id','version','visible']]},
 'admin/copies':{post:['Thêm cuốn; mã cấp trong transaction',{titleId:uuid,shelf:string,condition:string,note:string},['titleId']]},
 'admin/copies/status':{post:['Đổi trạng thái kho; cấm cuốn đang mượn',{id:uuid,version:money,status:{enum:['READY','REPAIR','DAMAGED','LOST','RETIRED']},reason:string},['id','version','status','reason']]},
 'admin/readers':{post:['Tạo độc giả, chuẩn hóa SĐT unique',{name:string,phone:string,category:{enum:['COMPANY','INTERNAL','WALK_IN']},address:string,email:string,organization:string,note:string},['name','phone','category']]},
 'admin/loans/quote':{post:['Báo giá mượn; dueDate, deposit, overdue, policyVersion, quoteToken',{$ref:'#/components/schemas/IssueFields'}]},
 'admin/loans/issue':{post:['Phát hành phiếu nhiều cuốn, khóa tồn kho, cọc và audit atomic',{$ref:'#/components/schemas/IssueFields'}]},
 'admin/returns/quote':{post:['Báo giá trả theo snapshot phiên bản cũ',{$ref:'#/components/schemas/ReturnFields'}]},
 'admin/returns':{post:['Nhận một cuốn, trả từng phần, tùy chọn quyết toán ngay',{$ref:'#/components/schemas/ReturnFields'}]},
 'admin/settlements/quote':{post:['Báo giá nghĩa vụ/cọc còn chờ',{itemId:uuid},['itemId']]},
 'admin/settlements':{post:['Quyết toán cuốn đã nhận trước đó',{itemId:uuid,version:money,quoteHash:string,walletId:uuid,cashConfirmed:boolean,reason:string},['itemId','version','quoteHash','reason']]},
 'admin/replacements':{post:['Nhận sách mới; cuốn cũ vẫn LOST',{itemId:uuid,reason:string},['itemId','reason']]},
 'admin/transfers':{post:['Hai vế chuyển ví cân bằng',{from:uuid,to:uuid,amount:money,reason:string},['from','to','amount','reason']]},
 'admin/transactions/reverse':{post:['Đảo chuyển ví bằng bút toán mới; không xóa dòng gốc',{id:uuid,reason:string},['id','reason']]},
 'admin/wallets':{post:['Thêm ví',{code:string,name:string,type:{enum:['MOMO','BANK','CASH','OTHER']},holder:string,account:string,bank:string,qrUrl:string,openingBalance:money},['code','name','type']]},
 'admin/contacts':{post:['Ghi liên hệ thu hồi thủ công',{loanId:uuid,channel:string,content:string,result:string,nextDate:{type:['string','null'],format:'date'}},['loanId','channel','content','result']]},
 'admin/reminders':{get:['Sinh idempotent và đọc các mốc nhắc hạn']},
 'admin/reminders/acknowledge':{post:['Xác nhận đã xem',{id:uuid},['id']]},
 'admin/settings':{post:['Tạo phiên bản chính sách; không sửa phiếu cũ',{libraryName:string,address:string,hotline:string,zaloOaId:string,lamourLoanMonths:money,guestLoanMonths:money,guestDepositAmount:money,lateFeePerDay:money,techFeeLostBook:money,outOfPrintMultiplier:money,lossLateFeeRule:{enum:['','CONFIRMATION_DATE','RESOLUTION_DATE']},unknownPricePriorityRule:{enum:['','REPLACE_FIRST','PAGE_RATE_FIRST']}}]},
 'admin/content':{post:['Nội dung hero của ba trang',{page:{enum:['home','isov','data']},title:string,description:string},['page','title','description']]},
 'admin/content-links':{post:['Cập nhật link thật/QR',{key:string,label:string,url:string,qrUrl:string,year:{type:['integer','null']},active:boolean},['key','label','url']]},
 'admin/print-documents':{post:['Phát hành snapshot quyết toán bất biến',{loanId:uuid},['loanId']]},
 'admin/book-export':{get:['Tải .xlsx; ?template=1 để lấy mẫu']},
 'admin/book-imports/validate':{post:['Multipart file .xlsx và mode CREATE/UPDATE; trả diff/lỗi theo dòng']},
 'admin/book-imports/commit':{post:['Commit job đã validate trong transaction',{jobId:uuid},['jobId']]},
 'admin/backups/export':{post:['Backup JSON có manifest/checksum; xác nhận lại password',{password:string},['password']]},
 'admin/account':{patch:['Đổi password rồi thu hồi toàn bộ phiên',{currentPassword:string,password:{type:'string',minLength:12}},['currentPassword','password']]}
};
const paths={};
for(const [p,methods] of Object.entries(endpoints)){
 paths['/'+p]={};for(const [method,[summary,fields,required=[]]]of Object.entries(methods)){
  const publicRoute=p.startsWith('public/')||p==='auth/login'||p==='auth/logout';
  const op={summary,security:publicRoute?[]:[{cookieSession:[]}],responses:{200:{description:'Thành công. JSON {data:...}; export trả file.'},400:{description:'Request không hợp lệ'},401:{description:'Chưa xác thực/hết phiên'},403:{description:'Sai Origin hoặc không có quyền'},409:{description:'Version/tồn kho/idempotency conflict'},422:{description:'Vi phạm nghiệp vụ'},429:{description:'Thử lại sau'},500:{description:'Lỗi máy chủ đã che thông tin'}}};
  if(method!=='get')op.parameters=[{name:'Idempotency-Key',in:'header',required:p.startsWith('admin/')&&!['admin/backups/export','admin/account','admin/book-imports/validate'].includes(p),schema:{type:'string',minLength:16,maxLength:100}}];
  if(fields)op.requestBody={required:true,content:{'application/json':{schema:fields.$ref?fields:{type:'object',properties:fields,required}}}};
  if(p==='admin/book-imports/validate')op.requestBody={required:true,content:{'multipart/form-data':{schema:{type:'object',required:['file','mode'],properties:{file:{type:'string',format:'binary'},mode:{enum:['CREATE','UPDATE']}}}}}};
  paths['/'+p][method]=op;
 }
}
const doc={openapi:'3.1.0',info:{title:'Lamour Library API',version:'1.0.0',description:'Same-origin API. Browser never accesses Supabase tables. Mutations require exact Origin; financial writes require Idempotency-Key. Dates YYYY-MM-DD, money integer VND.'},servers:[{url:'/api/v1'}],paths,components:{securitySchemes:{cookieSession:{type:'apiKey',in:'cookie',name:'lamour_session'}},schemas:{IssueFields:{type:'object',required:['readerId','copyIds','borrowDate'],properties:{readerId:uuid,copyIds:{type:'array',items:uuid,minItems:1,maxItems:100,uniqueItems:true},borrowDate:{type:'string',format:'date'},conditionNote:string,walletId:uuid,depositConfirmed:boolean,warningAcknowledged:boolean,quoteToken:string}},ReturnFields:{type:'object',required:['itemId','actualDate','outcome'],properties:{itemId:uuid,actualDate:{type:'string',format:'date'},outcome:{enum:['GOOD','MINOR_DAMAGE','MAJOR_DAMAGE','LOST']},damageAmount:money,conditionIn:string,reason:string,decisionBy:string,walletId:uuid,cashConfirmed:boolean,replacementReceived:boolean,settleNow:boolean,version:money,quoteHash:string}}}}};
await writeFile('docs/openapi.yaml',JSON.stringify(doc,null,2)+'\n');console.log('Generated',Object.keys(paths).length,'API paths.');
