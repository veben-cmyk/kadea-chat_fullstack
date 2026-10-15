import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'register.show': { paramsTuple?: []; params?: {} }
    'register.store': { paramsTuple?: []; params?: {} }
    'verify.email': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'login.store': { paramsTuple?: []; params?: {} }
    'chat.index': { paramsTuple?: []; params?: {} }
    'chat.conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'register.show': { paramsTuple?: []; params?: {} }
    'verify.email': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'chat.index': { paramsTuple?: []; params?: {} }
    'chat.conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'register.show': { paramsTuple?: []; params?: {} }
    'verify.email': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'chat.index': { paramsTuple?: []; params?: {} }
    'chat.conversation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'register.store': { paramsTuple?: []; params?: {} }
    'login.store': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}