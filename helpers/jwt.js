const expressJwt = require('express-jwt');

/**
 * Biblioteca express chamado express-jwt.
 * serve para prover segurança para as APIs no servidor
 * Isso ocorre pelo o uso  algoritmos encontrados no site jwt.io [utilizei p primeiro HS256]
 * 
 * O segredo é baseado em uma string qualquer onde é possível criar o Token
 * 
 * Então, quando o usuário passa qualquer token para o back-end, como "buscar lista de produtos", etc...
 * é necessário, então, comparar os token 'secret' declarado no .env
 * 
 * PORTANTO, se o token foi gerado baseado nesse 'secret' então será possível acessar a API.
 * 
 * PORÉM, se o token passado é baseado em outro 'secret', então a API não funcionará.
 * 
 * ----------------------------------------------------------------------------------------------------
 * 
 * É NECESSÁRIO BUSCAR os produtos sem token, ou seja, todos devem ter acesso aos produtos,
 * pois só assim é possível mostrar o que pode ser vendido e atrair clientes.
 * 
 * LOGO, precisa-se liberar acesso a API produtos sem token, mas proteger o método POST.
 * 
 * ISSO, impede que alguém cadastre produtos na loja, de forma maliciosa. (sql injection, etc...)
 * 
 * PORTANTO: é possível especificar os MÉTODOS que devem ser detro da função expressJwt (que requerem tokens)
 * e métódos que não devem aceitar token de autenticação json web token
 * 
 * REGULAR EXPRESSIONS: /\/api\/v1\/products(.*)/  
 * 
 * /\/api\/v1\/products(.*)/  = pega todas as APIs que vem após /products. Assim elimina o trabalho
 * de ter que digitar todas as APIs e quais regras não devem exigir token; elimina bastante linhas de código.
 * 
 * \ = SCAPING SLASH: prevents conflict with the slash we have to define.
 * \ = SCAPING SLASH: previne conflitos com a barra que precisamos definir.
 * 
 * é possível testar as expressões regulares com regex tester em: regex101.com
 * 
 *  
 * @returns expressJwt:
 */



// Metodo p autenticar json web token(jwt)
function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL // injetar o .env para utilizar ${api} na url e deixar o çódigo mais elegante
    return expressJwt({
        secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked
        // Excluir as APIS que não devem ter tokens em .unless({ path:[]}) took out of unless 'POST', 'PUT',
    }).unless({
        path: [
            { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/orders(.*)/, methods: ['GET', 'POST','OPTIONS'] }, // NÃO É NCESSÁRIO TOKEN PARA FAZER PEDIDO E BUSCAR. PENSAR EM REGRA PARA GET ORDER (SEGURANÇA) POSTERIORMENTE
            { url: /\/api\/v1\/users(.*)/, methods: ['GET', 'OPTIONS'] }, 
            `${api}/users/login`,
            `${api}/users/register`,
            // `${api}/users/get/count` somente admin deve ter acesso à quantidade de users. coloquei aqui para testes
        ]
    })
}

/**
 * 
 * @param {*} req : necessário para o usar o parâmentro 'request' como request body, 
 *                  e para verificar o que o usuário está enviando.
 * 
 * @param {*} payload : contém os dados contidos dentro do 'token', por exemplo, queremos pegar o id e 
 *                      o boolean admin que está em: routes/users.js linhas 67 a 83.
 * 
 *          const token = jwt.sign(
 *               {
 *                   userId: user.id,
 *                   admin: user.admin 
 *               },
 *               secret, 
 *               { expiresIn: '1d' } 
 *           )
 *
 * @param {*} done : resultado, é admin ou não...
 * 
 */


async function isRevoked(req, payload, done) {
    // Se o payload não é para admin,
    if (!payload.admin) {
        //  então rejeita-se o token: done(null, true) = rejeição do token
        done(null, true)
    }
    // Caso contrário, se for admin, retornar apenas done; sem parâmentros
    done();
}

module.exports = authJwt;