// Importar bibliotecas
const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Password Encryption Node.JS library.
const jwt = require('jsonwebtoken'); //json Web Token, biblioteca para definição de regras de autenticação


// GET lista de usuários
router.get(`/`, async (req, res) => {
    const userList = await User.find().select('name phone email'); // Mostrar apenas os campos nome, telefone e email

    if (!userList) {
        res.status(500).json({ success: false })
    }
    res.send(userList);
})

// Rota para p admin
router.post('/', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10), // senha criptografada utilizando a biblioteca do Node 'bcryptjs'
        phone: req.body.phone,
        admin: req.body.admin,
        street: req.body.street,
        number: req.body.number,
        division: req.body.division,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
        observations: req.body.observations,
    })
    user = await user.save();

    if (!user)
        return res.status(400).send('Não foi possível criar usuário')

    res.send(user);
})

// GET usuário específico pelo o id
router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).select('-password'); // Excluir o campo senha na chamada API

    // Se não achar usuaŕio pelo o id, passar mensagem:
    if (!user) {
        res.status(500).json({ message: 'Não encontramos esse usuário.' })
    }
    // Caso contrário: ok.
    res.status(200).send(user);

})

// POST login user com email. Primeiro verifica-se se o usuário já existe no sistema produrando pelo o email
router.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    const secret = process.env.secret;

    // Se não existe usuário, mostrar mensagem de erro: verificar se realmente existe usuário com o email informado pelo usuário
    if (!user) {
        return res.status(400).send('Usuário não encontrado');
    }

    // Após achar o usuário pelo email, combinar/comparar o hashpassword com a a senha fornecidade pelo usuário
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
        // utilizar a biblioteca jsonWebToken. chama-se o método sign() e passa-se o objeto dentro do método sign()
        const token = jwt.sign(
            {
                userId: user.id,
                admin: user.admin // Como segurança, verificar se o usuário é admin. Impede que hackers criem dados falsos em formato json referente a admin para conseguir acesso ao painel admin

            },
            secret, // Passar o 'secret' neste segundo parâmetro. Este secret foi definido no .env
            { expiresIn: '365d' } // Opção do jwt para especificar duração do token. um ano
        )
        res.status(200).send({ user: user.email, token: token })
    } else {
        res.status(400).send('Senha equivocada')
    }

})

// Rota para registrar um novo usuário: copiei a rota (/) que será para o admin
router.post('/register', async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        admin: req.body.admin,
        street: req.body.street,
        number: req.body.number,
        division: req.body.division,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
        observations: req.body.observations,
    })
    user = await user.save();

    if (!user)
        return res.status(400).send('O usuário não pode ser criado.')

    res.send(user);
})

// GET quantidade de usuários cadastrados
router.get(`/get/count`, async (req, res) => {
    // Utilizei método do mongoose .countDocuments. Conta todos os objetos dentro da Tabela instanciada pela Model
    let userCount = await User.countDocuments();

    if (!userCount) {
        res.status(500).json({ success: false });
    }
    res.send({
        quantidade: userCount,
    });
})

// DELETAR usuário: 
router.delete('/:id', (req, res) => {
    // Achar id Model User e remover. Acha-se o id via request parameter id
    // Retorna, então, uma 'promessa' Document chamado categoria deletada...
    User.findByIdAndRemove(req.params.id).then(user => {

        // Se achar user, retorna staus 200: ok  e mensagem (front-end friendly)
        if (user) {
            return res.status(200).json({ success: true, message: 'Usuário excluído com sucesso' })
            // Se não achar...
        } else {
            return res.status(404).json({ success: false, message: 'Não conseguimos encontrar essa usuário' })
        }
    })
        // Mensagens de erro para erros de conexão e dados equivocados
        .catch(err => {
            return res.status(400).json({ success: false, error: err })
        })
})

router.put('/:id', async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            password: bcrypt.hashSync(req.body.password, 10),
        },
        { new: true }
    );

    if (!user) {
        return res.status(404).send('User not found');
    }

    res.send(user);
});
module.exports = router;