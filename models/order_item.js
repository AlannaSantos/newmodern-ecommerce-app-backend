const mongoose = require('mongoose'); // importar framework mongoose 

const orderItemSchema = mongoose.Schema({
    quantity: {
        type: Number,
        required: true
    },
    // Seguindo lógica entidade relacional, aqui seria a fk_produto, ou seja, um item pedido possui varios produtos
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'

    }
})

// Transformar _id to id and __v para objeto
orderItemSchema.method('toJSON', function(){
    const { __v, ...object } = this.toObject();
    const { _id:id, ...result } = object;
    return { ...result, id };
});

exports.OrderItem = mongoose.model('OrderItem', orderItemSchema);

