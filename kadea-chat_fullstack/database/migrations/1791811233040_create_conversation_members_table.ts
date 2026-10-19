import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversation_members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        
      table
        .integer('conversation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('conversations')
        .onDelete('CASCADE')
        
      table.string('role').notNullable().defaultTo('member') // admin, member
      table.timestamp('last_read_at', { useTz: true }).nullable() // Dernier horodatage de lecture
      table.timestamp('joined_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.unique(['user_id', 'conversation_id'])

      table.index(['conversation_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}