(function(window, undefined)
{

    $(document).ready(function()
    {

        $('.role-login').click(function()
        {

            if ($('.role-login-user').val().length == 0)
            {
                alert('请输入用户名');
                return;
            }

            if ($('.role-login-pass').val().length == 0)
            {
                alert('请输入密码');
                return;
            }

            vj.ajax(
            {
                action: 'login',
                data:   {

                    user:   $('.role-login-user').val(),
                    pass:   $('.role-login-pass').val()

                },

                onSuccess: function(d)
                {
                    console.log(d);
                },

                onFailure: function(d)
                {
                    console.log(d);
                },

                onError: function(d)
                {
                    console.log(d);
                }
            });

        });

        $('.role-reg').click(function()
        {

            if ($('.role-reg-user').val().length == 0)
            {
                alert('请输入用户名');
                return;
            }

            if ($('.role-reg-pass').val().length == 0)
            {
                alert('请输入密码');
                return;
            }

            if ($('.role-reg-nick').val().length == 0)
            {
                alert('请输入昵称');
                return;
            }

            if ($('.role-reg-pass').val() !== $('.role-reg-pass-rep').val())
            {
                alert('两次密码不一致');
                return;
            }

            vj.ajax({

                action: 'reg',
                data: {

                    user:   $('.role-reg-user').val(),
                    pass:   $('.role-reg-pass').val(),
                    nick:   $('.role-reg-nick').val()

                },

                onSuccess: function(d)
                {
                    console.log(d);
                },

                onFailure: function(d)
                {
                    console.log(d);
                },

                onError: function(d)
                {
                    console.log(d);
                }

            });

        });

    });

})(window);