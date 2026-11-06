export type UUID=string;
export type DateOnly=string;
export type MoneyVnd=number;
export type CopyStatus='READY'|'ON_LOAN'|'REPAIR'|'DAMAGED'|'LOST'|'RETIRED';
export type ReaderCategory='COMPANY'|'INTERNAL'|'WALK_IN';
export type Outcome='GOOD'|'MINOR_DAMAGE'|'MAJOR_DAMAGE'|'LOST';
export interface PublicBook {
  code:string;title:string;authors:string;category:string;cover_url:string;short_description:string;description:string;publisher:string;language:string;total:number;available:number;
}
export interface IssueRequest {
  readerId:UUID;copyIds:UUID[];borrowDate:DateOnly;conditionNote:string;walletId?:UUID;
  depositConfirmed:boolean;warningAcknowledged:boolean;quoteToken:string;verificationNote?:string;notes?:string;deliveryMethod?:string;
}
export interface ReturnRequest {
  itemId:UUID;actualDate:DateOnly;outcome:Outcome;conditionIn:string;reason:string;decisionBy?:string;damageAmount?:MoneyVnd;
  walletId?:UUID;cashConfirmed:boolean;replacementReceived:boolean;settleNow:boolean;version:number;quoteHash:string;
}
export interface SettlementQuote {
  days:number;late:MoneyVnd;damage:MoneyVnd;replacement:boolean;total:MoneyVnd;applied:MoneyVnd;refund:MoneyVnd;extra:MoneyVnd;
  version:number;itemId:UUID;quoteHash:string;
}
export interface Success<T>{data:T}
export interface Failure{error:{code:string;message:string;requestId:UUID}}
