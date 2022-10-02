
import ('dotenv');
import Joi from '@hapi/joi'
import { createNFT, check_authenticity }from './create'
const express = require('express');
const app = express()
app.use(express.json());


app.get('/', (req: any, res: any) => {
  res.send("hello");
})

app.post('/check', async function(req: any, res: any) {
  const schema = Joi.object({
    metadatafile: Joi.object().required(),
    asset_id: Joi.string().required()
  })
  const result = await schema.validateAsync(req.body);
  if (result.error) {
    console.log(result.error)
    res.status(400).send(result.error.details[0].message);
    return;
  };
  
  const { authorization } = req.headers;
  if (authorization && authorization === '123456') {
    try {
      
      const check = await check_authenticity(result.metadatafile, result.asset_id )
      console.log(check);
      const obj = {"authenticity": check}
      res.status(201).send(obj)
        
      
      
    } catch (err) {res.send("There was an error when minting")}
    }
  
})

app.post('/mint', async function (req: any, res: any, ) {
  const schema = Joi.object({
    metadatafile: Joi.object(),
    pon_id: Joi.string()

  })
  const result = await schema.validateAsync(req.body);
  if (result.error) {
    console.log(result.error)
    res.status(400).send(result.error.details[0].message);
    return;
  };
  const post = req.body
  const { authorization } = req.headers;
  console.log(authorization);
  if (authorization && authorization === '123456') {
    console.log(post);
    try {
      
      let assetId = await createNFT(result.metadatafile, result.pon_id )
      console.log(assetId);
      
      res.status(201).send(assetId);
      
    } catch (err) {res.send("There was an error when minting")}}
  
  
})


const port = process.env.PORT || 3001
app.listen(port, () => console.log(`listening on ${port}...`))