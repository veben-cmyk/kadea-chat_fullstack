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
    'chat.new': { paramsTuple?: []; params?: {} }
    'chat.store': { paramsTuple?: []; params?: {} }
    'chat.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
    'profile.avatar': { paramsTuple?: []; params?: {} }
    'profile.avatar.destroy': { paramsTuple?: []; params?: {} }
    'logout': { paramsTuple?: []; params?: {} }
    'group.new': { paramsTuple?: []; params?: {} }
    'group.store': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'register.show': { paramsTuple?: []; params?: {} }
    'verify.email': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'chat.index': { paramsTuple?: []; params?: {} }
    'chat.new': { paramsTuple?: []; params?: {} }
    'chat.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'group.new': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'register.show': { paramsTuple?: []; params?: {} }
    'verify.email': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'chat.index': { paramsTuple?: []; params?: {} }
    'chat.new': { paramsTuple?: []; params?: {} }
    'chat.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: []; params?: {} }
    'group.new': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'register.store': { paramsTuple?: []; params?: {} }
    'login.store': { paramsTuple?: []; params?: {} }
    'chat.store': { paramsTuple?: []; params?: {} }
    'messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
    'profile.avatar': { paramsTuple?: []; params?: {} }
    'profile.avatar.destroy': { paramsTuple?: []; params?: {} }
    'logout': { paramsTuple?: []; params?: {} }
    'group.store': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}