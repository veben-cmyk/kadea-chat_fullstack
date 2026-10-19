import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('conversation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('conversations')
        .onDelete('CASCADE')
        
      table
        .integer('sender_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT') // Empêche la suppression d'un user s'il a posté des messages (sécurité)
        
      table.text('content').nullable()
      table.string('file_url').nullable()
      table.string('file_type').nullable()
      table.boolean('is_deleted').notNullable().defaultTo(false)

      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['conversation_id', 'id'])
      
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}