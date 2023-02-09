const { Order } = require('../models/order'); // Importar Model Order
const { OrderItem } = require('../models/order_item'); // Importar Model OrderItem
const { user } = require('../models/user'); // Importar Model User
const express = require('express');
const { get } = require('mongoose');
const router = express.Router();



// GET lista de pedidos (todos os pedidos) | .populate(user) mostra os detalhes usuário que fez o pedido | ordenar pedidos por data .sort(date_ordered)
router.get(`/`, async (req, res) => {
    const orderList = await Order.find().populate('user', 'name').sort({ 'date_ordered': -1 });

    if (!orderList) {
        res.status(500).json({ success: false, message: 'Não há pedidos' })
    }
    res.send(orderList);
})

// GET pedido específico pelo o ID com os dados do usuário e itens pedidos
router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name') // Popula a 'collection' order com o nome do usuário ao invés da objectId (front-end friendly)
        .populate({ path: 'orderItems', populate: { path: 'product', populate: 'category' } });// popula items-pedido com os dados do produto e a categoria ao invés de somente objectId (front-end friendly)
    if (!order) {
        res.status(500).json({ success: false, message: 'Não há pedidos' })
    }
    res.send(order);
})


// POST pedido utilizando await and async
router.post('/', async (req, res) => {
    // Criar alguns order_itens (itens_pedidos) com mongoose (testes) utilizando 'loop' (map)
    const orderItemsIds = Promise.all(req.body.orderItems.map(async order_item => {
        // um novo item-pedido igual a um novo Model item pedido (igual criar um novo objeto; mesmo processo; é tipo um post request)
        let newOrderItem = new OrderItem({
            quantity: order_item.quantity,
            product: order_item.product // item-pedido relaciona-se com produto, ou seja,  possui id produto como fk
            
        })

        // Salvar os dados no BD
        newOrderItem = await newOrderItem.save();

        // Retorna o Id do item-pedido (returns objectId).Ou seja, retorna apenas os Ids em array
        return newOrderItem._id;
    }))
    const orderItemsIdsResolved = await orderItemsIds;

    // Constante para resolver calculo valor total...
    const totalPrices = await Promise.all(orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
        const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice // retorna um array de totalPrices
    }))

    // constante totalPrice igual ao array totalPrices reduzido, (combinação dos valores | soma de todos os valores dentro de um array)
    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);



    let order = new Order({
        orderItems: orderItemsIdsResolved, // Pegar somente as IDs de order_items
        street: req.body.street,
        number: req.body.number,
        division: req.body.division,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        observations: req.body.observations,
        status: req.body.status,
        total_price: totalPrice, // total_price é uma variável que deve ser calculada internamente [SEGURANÇA]
        user: req.body.user,
        date_ordered: req.body.date_ordered,

    })

    // Espera-se até salvar o pedido. O pedido salvo, então, retorna uma 'promessa' com o Documento. (Promise returns a Document)
    order = await order.save();

    // Após o 'await', checa-se se a ordem/pedido foi criada
    // Se a ordem/pedido não foi criada
    if (!order)

        // Retorna mensagem de erro 404 não encontrado e passa a mensagem ao cliente
        return res.status(404).send('Não foi possível completar o seu pedido!')

    // Se o pedido foi criado com sucesso, então: retorna o pedido criado
    res.send(order);

})

// PUT pedido: Atualizar pedido (order)
router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(

        // Atualizaremos apenas o status do produto: de pendente para enviado.  
        req.params.id,
        {
            status: req.body.status
        },
        { new: true } // Mostrar os dados novos
    )

    // Se o pedido não foi encontrado
    if (!order)

        // Retorna 404 não encontrado e passa mensagem ao cliente
        return res.status(404).send('Não foi possível encontrar esse pedido.')

    // Se o pedido existe, então: retorna o pedido atualizado
    res.send(order);
})


// DELETAR pedido: explicação nas linhas 192 a 209
router.delete('/:id', (req, res) => {

    Order.findByIdAndRemove(req.params.id).then(async order => {

        if (order) {
            await order.orderItems.map(async order_item => {

                await OrderItem.findByIdAndRemove(order_item)
            })
            return res.status(200).json({ success: true, message: 'Pedido excluído com sucesso' })

        } else {
            return res.status(404).json({ success: false, message: 'Não conseguimos encontrar esse pedido' })
        }
    })
        .catch(err => {
            return res.status(400).json({ success: false, error: err })
        })
})


// Pegar o valor total de vendas | pegar o total de vendas diretamente da Colection Orders no MongoDB 
router.get('/get/totalsales', async (req, res) => {
    // constante (isto é, variável) vendasTotais utilizando o método aggregate
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$total_price' } } }
    ])

    // Se não achar totalVendas...
    if (!totalSales) {
        return res.status(400).send('Não foi possível gerar o valor total de vendas')
    }
    // Caso contrário, retorna a soma de todas as vendas realizadas no sistema
    res.send({ totalsales: totalSales.pop().totalsales })

})

// Pegar a quantidade total de pedidos no ecommerce newmodern | mesma lógca utilizada para produtos
router.get(`/get/count`, async (req, res) => {
    // Utilizei método do mongoose .countDocuments. Conta todos os objetos dentro da Tabela instanciada pela Model
    let orderCount = await Order.countDocuments();

    if (!orderCount) {
        res.status(500).json({ success: false, message: 'Não existe pedidos ainda' });
    }
    res.send({
        quantidadePedidos: orderCount,
    });
})

/**
 * HISTÓRICO DE PEDIDOS USUÁRIO ESPECÍFICO:
 * 
 * Reutilizei o metodo pegar todos os pedidos, linha: 11
 * 
 * Para pegar pedidos do usuário específico, passei como CONDIÇÃO no método find() o objeto: userid
 * 
 * Como pegamos o usuario via ID, não é necessário 'popular' json com dados usuário. 
 * PORTANTO: troquei .populate('user','name') pelo os dados do produto daquele pedido.
 * OU SEJA: reutilizei o código .populate da linha 24
 * 
 */

// GET histórico de pedidos usuário - requisito funcional: histórico pedidos
router.get(`/get/userorders/:userid`, async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userid }).populate({
        path: 'orderItems', populate: {
            path: 'product', populate: 'category'
        }
    }).sort({ 'date_ordered': -1 });

    if (!userOrderList) {
        res.status(500).json({ success: false, message: 'Não há pedidos' })
    }
    res.send(userOrderList);
    
})


module.exports = router;