// https://github.com/WebDevSimplified/JWT-Authentication/blob/master/authServer.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const exp = '300s';

class Authenticator
{
    constructor()
    {
        this.refreshTokens = [];
    }

    authenticate(data, _callback)
    {
        const accessToken = jwt.sign({ name: data.name }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: exp });
        const refreshToken = jwt.sign({ name: data.name }, process.env.REFRESH_TOKEN_SECRET);
        this.refreshTokens.push(refreshToken);
        return _callback({ accessToken: accessToken, refreshToken: refreshToken });
    }

    check(token, _callback)
    {
        if (!token)
            return _callback(null);
        
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, data) => 
        {
            if (err)
                return _callback(null); 
                
            return _callback(data);
        });
    }

    refresh(token, _callback)
    {
        if (!token || !this.refreshTokens.includes(token))
            return _callback(null);
        
        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, data) => 
        {
            if (err)
                _callback(null);
            
            this.invalidate(token);
            return this.authenticate(data, _callback);
        });
    }

    invalidate(token)
    {
        this.refreshTokens = this.refreshTokens.filter(refreshToken => refreshToken !== token);
    }
}

module.exports = Authenticator;