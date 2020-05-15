module.exports = `
    INSERT INTO users (username, password)
    VALUES
        ("user1", "$2b$10$XCmPQXL/wOWj6kPe9a9N9OJsINA/4TP.tTpTWmuW4Nc3So6xSc0dK"),
        ("user2", "$2b$10$nwM0JchCL8tQFiQvlX0TleJbdrJEf18gNCJGQzQrd3gf7qEzcP2q."),
        ("user3", "$2b$10$XJtFFKCWUJACg.QBYWGjduyVIM5Kn1S8Yq3/OhWH8YXet0gQtEu8W"),
        ("user4", "$2b$10$l1YZWxtyDWFLBitS3IuE/.0QMasMSML5BwhsQI/IBoxn3qRlh98.G"),
        ("user5", "$2b$10$EI0UHkH58dRy7UCTI1Eec.oK6zHJlzCFrTmMgznRusvlYBWXHBCQe"),
        ("user6", "$2b$10$Eox4lWsTC3sVEcUBv5kMaeD3O8snpNuQ3jBdqOggDO8fwLCE/m0iK"),
        ("user7", "$2b$10$ZvZyjvyLaWli29snForiVemOatUOGrFcTyYoUcUETqCXFJ6H8TDQ6"),
        ("user8", "$2b$10$iGaseUi8eY2ihlm0jvEIlO2OIJkNJvg3xnNVVx01hv/LY1sDIpXA.");

    INSERT INTO friendships (username, friend)
    VALUES
        ("user1", "user3"),
        ("user1", "user4"),
        ("user1", "user5"),
        ("user1", "user6"),
        ("user2", "user3"),
        ("user2", "user4"),
        ("user2", "user5"),
        ("user3", "user2"),
        ("user3", "user5"),
        ("user3", "user1"),
        ("user4", "user2"),
        ("user4", "user1"),
        ("user5", "user2"),
        ("user5", "user3"),
        ("user5", "user1"),
        ("user6", "user1");

    INSERT INTO friendship_requests (requester, responder)
    VALUES
        ("user6", "user2");
        
    INSERT INTO administrators (username, password)
    VALUES
        ("admin", "$2b$10$iGaseUi8eY2ihlm0jvEIlO2OIJkNJvg3xnNVVx01hv/LY1sDIpXA.");`