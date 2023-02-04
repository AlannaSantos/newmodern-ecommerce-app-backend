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

/**
 *  POST METHOD ORDER:
 * 
 *   Verificar pq não estou recebendo itens-pedido...
 * 
 *   DEBUG console.log(orderItems): [ Promise { <pending> }, Promise { <pending> } ]
 *   Ou seja, não está retornando o objectId, mas sim, as promises, do async method vazias
 *
 *   Portanto, para resolver isso, é necessário combinar essas 'promises'
 *
 *   RESULTADO: Promise.all(req.body.order_items.map(async order_item... 
 *   que faz um loop(.map) em itens pedidos e pega os fk_IDs referenciadas (objectIds)
 *   assim foi possível resolver UMA  'promise'.
 *   
 *
 *   Para resolver a segunda 'promise' e retornar o array items-pedido em pedido
 *   tive que criar uma nova constante chamada orderItemsIdsResolved
 *
 *   SOLUÇÃO: a primeira 'promise' orderItemsIds é retornada normalmente no método async/awaits.
 *   Para retornar a segunda 'promise', criei uma nova constante chamada: orderItemsIdsResolved.
 *   essa constante é a segunda 'promise' e ela 'awaits': ou seja, espera pela a primeira 'promise,:orderItemsIds 
 *   
 * ----------------------------------------------------------------------------------------------------------------
 *  SEGURANÇA: VALOR TOTAL DO PEDIDO.
 * 
 *  Enviar o valor total do pedido não é uma boa prática. OBVIAMENTE! 
 *  Por exemplo, é possível que um 'hacker' mude o valor total do pedido com um valor total falso
 *  Ou seja, é possível que o 'hacker' altere o valor de uma compra de R$ 2.000,00 para R$ 2,00.
 *  
 *  No mundo real, se a sua loja estiver muito movimentada, esse valor falso pode passar despercebido
 *  
 *  PORTANTO, depois que o usuário manda os dados dos itens pedidos no back-end, calcula-se o valor total
 *  dos itens pedidos baseado no valor que temos no banco de dados. 
 * 
 *  LÓGICA VALOR TOTAL ITENS-PEDIDOS:
 *  efetuar um 'loop' em itens_pedidos recebido do usuário no front-end e resolver o calculo: (multi e soma básica)
 *  
 *  valor_produto * quantidade_carrinho = valor_total_item_pedido1
 *  valor_total_compra = valor_total_item_pedido1 + valor_total_item_pedido(n)...
 *  
 * 
 *  OU seja, acessa-se a Model/Schema produto, que está relacionada com itens_pedidos (cardinalidade de muitos para um)
 *  e realiza-se o calculo básico mencionado nas linhas 67 e 68 com os dados valor produto cadastrado previamente
 *  pelo o mantenedor.
 *  
 *  IMPLEMENTAÇÃO VALOR TOTAL ITENS_PEDIDOS
 *  
 *  troquei total_price: .req.body.total_price, por uma variável chamada totalPrice
 *  
 *  A variável totalPrice, vem da totalPrices (const TotalPrices). que é o array com todos os valores de itens_pedidos
 *  
 *  Nessa constante, chama-se a var Promise que pega todas as OrderItemsResolvedIds (items_pedidos dentro de pedidos)
 *  e efetua um loop neles (map). Esse 'loop' tem a finalidade de pegar e salvar o Id do item_pedido guardado no BD.
 * 
 *  Portanto, utlizando async and await para o order_item, é possível, então, 'pegar' ou achar o ID de item_pedido
 *  após o loop inicial (.map)
 * 
 *  APÒS isso, busca-se, dentro de item_pedido, o id, quantidade e valor do produto relacionado àquele item_pedido
 * (.populate (product, total_price))...
 * 
 *  ENTÃO: criei uma nova constante 'totalPrice' para realizar a lógica valor total pedido e passei essa variável
 *  com os dados salvos, no body de:
 *  let Order = new Order({
 *              ...
 *              total_price: totalPrice   
 *              })
 * 
 *  RESSALTA-SE QUE UTILIZEI UM MÉTODO FAMOSO PARA COMBINAR OS VALORES DOS ITENS_PEDIDOS, CHAMADO: Array.prototype.reduce()
 *  
 * O método reduce() executa uma função reducer (fornecida por você) para cada elemento do array, 
 * resultando num único valor de retorno. 
 * 
 * no nosso caso, retornou a soma de todos os itens-pedidos em totalPrice, conforme a lógica descrita
 * nas linhas 67 e 68.
 * 
 */


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
        return newOrderItem.id;
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

/**
 * DELETAR PEDIDO JUNTO COM OS ITEMS PEDIDOS. EM LARAVEL, PARA REALIZAR ISSO, BASTAVA USAR 'CASCADE'
 * NO 'DELETE METHOD'
 * 
 * PORÉM, REALIZAR ISSO É UM POUCO MAIS DIFÍCIL EM NODE.JS
 * 
 * SOLUÇÃO: 
 * após achar o pedido (order) pelo o id e remover o mesmo,
 * realiza-se um loop em itens-pedidos (order_itens) com o 'map'
 * esse loop busca por todos os itens pedidos, acha-os e deleta-os
 * 
 * Como só estamos armazenado os IDs do itens_pedidos em pedidos, 
 * é possível, então, utilizar findByIdAndRemove(order_item) 
 * 
 * Utilizei dois 'async' neste método, no primeiro, 'async order',
 * espera-se até excluir todos os pedidos (await). Isso ocorre, também,
 * para itens pedidos. Após a exclusão dos ids pelo 'async | awaits', continua-se, então
 * O método deletar pedido, isto é, retorno de mensagens de sucesso ou fracasso. 
 * 
 */

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

/**
 * Ao utilizar o método aggregate, é possível AGRUPAR ( isto é, JOIN, utilizando termos de bd relacional)
 * todas as tables (Collections) e os documentos dentro da Collection específica para UMA COLLECTION,
 * Após esse agrupamento, é possível pegar (buscar, utilizando mongoose) uma campo específico,
 * no nosso caso: total_price (valor total).
 * 
 * PORTANTO, podemos pegar o total_price 'AGRUPADO' (JOINED) e utilzar um método do mongoose chamado: sum()
 * este método retornará a soma de todos os valores totais do pedido. Ou seja, retornará o valor total de todas
 * as vendas realizadas na newmodern ecommerce app.
 * 
 * a lógica da soma de todas as vendas se encontra nas linhas 251 a 252. 
 * 
 */

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
    const userOrderList = await Order.find({ user: req.params.userId }).populate({
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