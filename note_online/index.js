
//加载依赖库
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var session = require('express-session');
var moment=require('moment');

//引入mongoose
var mongoose = require('mongoose');
//引入模型
var models = require('./models/models');

var User = models.User;
var Note = models.Note;

//引入未登录情况下的解决办法

//var checkLogin = require('./checkLogin.js');

//使用mongoose链接服务
mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error',console.error.bind(console,'链接数据库失败'));




//创建express实例
var app = express();

//定义EJS模板引擎和模板文件位置
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

//定义静态文件目录
app.use(express.static(path.join(__dirname,'public')));

//定义数据解析器
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//建立session模型
app.use(session({
    secret:'1234',
    name:'mynote',
    cookie:{maxAge:1000*60*20},//设计session的保存时间为20分钟
    resave:false,
    saveUninitialized:true
}));

//响应首页get请求
app.get('/',noLogin);
app.get('/',function(req,res){

    Note.find({author:req.session.user.username})
        .exec(function(err,allNotes){
            if (err){
                console.log(err);
                return res.redirect('/');
            }
            res.render('index',{
                title:'首页',
                user:req.session.user,
                notes:allNotes
            });

        });
});



//测试
function noLogin(req, res, next){
    if (!req.session.user){
        console.log('抱歉，您还没有登录！');
        return res.redirect('/login');//返回登录页面
    }

    next();
}


//获取笔记详情
app.get('/detail/:_id',function(req,res){
    console.log('查看笔记！');
    Note.findOne({_id: req.params._id})
        .exec(function(err,art){
                if (err){
                    console.log(err);
                    return res.redirect('/');
                }

                if (art) {
                    res.render('detail',{
                        title:'笔记详情',
                        user:req.session.user,
                        art:art,
                        moment:moment
                    });
                }
        })
});



app.get('/register',function(req,res){
    console.log('注册！');
    res.render('reginster',{
        user:req.session.user,
        title:'注册'
    });
});

//post请求
app.post('/register', function (req,res) {
    //req.body可以获取到表单的每项数据
    var username = req.body.username,
        password = req.body.password,
        passwordRepeat = req.body.passwordRepeat,
        parten=/^[a-zA-Z0-9_]/;
    //检查输入的用户名是否为空，使用trim去掉两端空格
    if (username.trim().length == 0){
        console.log('用户名不能为空！');
        return res.redirect('/register');
    }

    //检查用户名：只能是字母、数字、下划线的组合，长度3-20个字符
    //只能输入3-20个以字母开头、可带数字、“_”、“.”的字串

        var patrn=/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){2,19}/;
        if (!patrn.exec(username)){
            console.log('用户名格式不对');
            return res.redirect('/register');
        }else {
            console.log('用户名格式对');
        }

    //检查密码：长度不能少于6，必须同时包含数字、小写字母、大写字母。

    var patrn=/^(\w){6,20}$/;
    if (!patrn.exec(password)){
        console.log('密码只能输入6-20个字母、数字、下划线');
        return res.redirect('/register');
    }



    //检查输入的密码是否为空，使用trim去掉两端空格
    if (password.trim().length == 0 || passwordRepeat.trim().length == 0){
        console.log('密码不能为空！');
        //alert("密码不能为空!");
        return res.redirect('/register');
    }

    //检查输入的密码是否一致
    if (password != passwordRepeat){
        console.log('两次输入的密码不一致！');
        //alert("两次输入的密码不一致！");
        return res.redirect('/register');
    }

    //检查用户名是否已经存在，如果不存在，则保存该记录
    User.findOne({username:username},function(err,user){
        if (err){
            console.log(err);
            return res.redirect('/register');
        }

        if (user){
            console.log('用户名已经存在');
            return res.redirect('/register');
        }

        //对密码进行md5加密
        var md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');
        //新建user对象用于保存对象
        var newUser = new User({
            username:username,
            password:md5password
        });

        newUser.save(function(err,doc){
            if (err){
                console.log('注册成功！');
                return res.redirect('/register');
            }
            console.log('注册成功！');
            return res.redirect('/');
        });
    });
});

app.get('/login',function(req,res){
    console.log('登录！');
    res.render('login',{
        user:req.session.user,
        title:'登录'
    });
});



app.post('/login',function(req,res){
    var username = req.body.username,
        password = req.body.password;

    User.findOne({username:username},function(err,user){
        if (err){
            console.log(err);
            return res.redirect('/login');
        }

        if (!user){
            console.log('用户不存在!');
            return res.redirect('/login');
        }

        //对密码进行MD5加密
        var md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');
        if (user.password !== md5password){
            console.log('密码错误!');
            return res.redirect('/login');
        }
        console.log('登录成功！');
        user.password = null;
        delete user.password;
        req.session.user = user;
        return res.redirect('/');
    });
});






app.get('/quit',function(req,res){
    req.session.user = null;
    console.log('退出！');
    return res.redirect('/login');
});

app.get('/post',function(req,res){
    console.log('发布！');
    res.render('post',{
        user: req.session.user,
        title:'发布'
    });
});

app.post('/post', function (req,res) {
    var note = new Note({
        title:req.body.title,
        author:req.session.user.username,
        tag:req.body.tag,
        content:req.body.content
    });


    note.save(function(err,doc){
        if (err){
            console.log(err);
            return res.redirect('/post');
        }

        console.log('文章发表成功！');
        return res.redirect('/');
    });

});








//监听3000端口
app.listen(3000,function(req,res){
    console.log('app is running at port 3000');
});