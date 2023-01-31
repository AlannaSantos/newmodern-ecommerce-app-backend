// Importar Mongoose. Mongoose é igual ao Eloquent ORM do Laravel. Realiza a comunicação do BD com a aplicação
const mongoose = require('mongoose');

/* Novos campos para o produto
 *   

    chip: req.body.chip,
    color: req.body.color,
    weight: req.body.weight,
    system: req.body.system,
    ram: req.body.ram,
    internal_memory: req.body.internal_memory,
    processor: req.body.processor,
    digital: req.body.digital,
    connectivity: req.body.connectivity,
    front_camera_resolution: req.body.front_camera_resolution,
    back_camera_resolution: req.body.back_camera_resolution,
    front_camera_resources: req.body.front_camera_resources,
    battery: req.body.battery,
*/

// Schema p/ Produto
const productSchema = mongoose.Schema({
    // Nome é obrigatório
    name: {
        type: String,
        required: true
    },
    // Descrição curta é obrigatório
    description: {
        type: String,
        required: true
    },
    // Descrição longa não é obrigatório e o valor padrão é vazio 
    long_description: {
        type: String,
        default: ''
    },
    // Imagem Miniatura não é obrigatório e o valor padrão é vazio 
    image: {
        type: String,
        default: ''
    },
    // Como se trata de multiplas imagens, passa-se o tipo dentro do array.
    images: [{
        type: String
    }],
    // Marca não é obirgatório e o padrão é vazio
    brand: {
        type: String,
        default: ''
    },
    // Preço não pe obrigatório e padrão é zero
    price: {
        type: Number,
        default: 0
    },
    /**
     * Fk_id_category: o 'link' ou ligação entre a tabela produto e categoria 
     * se dá por meio da referenciação da id categoria. Então, utilizando a documentação Mongoose, 
     * conseguimos definir o tipo, isto é, pegar o id do objeto e referenciar o id pelo Schema categoria.
     * 
     * O mongoose, portanto, é igual ao Eloquent ORM do Laravel. É pelo Mongoose que ocorre a comunicação
     * do BD com o código fonte da aplicação.
     * 
     *  */
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    // Quantidade em estoque é obrigatório. Quantidade minima = zero, impede a inserção de quantidades negativas
    qty: {
        type: Number,
        required: true,
        min: 0,
        max: 255
    },
    // Avaliação: não é obrigatório. Se der tempo, implementarei isso
    rating: {
        type: Number,
        default: 0
    },
    // Numero de avaliações: não é obrigatório. Se der tempo, implementarei isso
    number_reviews: {
        type: Number,
        default: 0
    },
    // Produto destaque: não é obrigatório. Se der tempo, implementarei isso; mas será como os produtos novos do projeto integrador 1
    featured: {
        type: Boolean,
        default: false
    },
    date_created: {
        type: Date,
        default: Date.now
    },
    chip: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: ''
    },
    weight: {
        type: Number,
        default: ''
    },
    system: {
        type: String,
        default: ''
    },
    ram: {
        type: Number,
        default: ''
    },
    internal_memory: {
        type: Number,
        default: ''
    },
    processor: {
        type: String,
        default: ''
    },
    digital: {
        type: String,
        default: ''
    },
    connectivity: {
        type: String,
        default: ''
    },
    front_camera_resolution: {
        type: Number,
        default: ''
    },
    back_camera_resolution: {
        type: Number,
        default: ''
    },
    front_camera_resources: {
        type: String,
        default: ''
    },
    battery: {
        type: Number,
        default: ''
    },

})

// Transformar _id para id e retirar __v da resposta json (front-end friendly)
productSchema.method('toJSON', function () {
    const { __v, ...object } = this.toObject();
    const { _id: id, ...result } = object;
    return { ...result, id };
});

// Model Produto, passando o Schema acima
exports.Product = mongoose.model('Product', productSchema);