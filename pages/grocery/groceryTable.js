import React from "react";
import { Container, Table } from 'react-bootstrap';

const InitialGrocery = [
    {
      "itemDesc": "Fresho Lettuce - Romaine 100 to 150 g ",
      "itemQty": 1,
      "itemPrice": "₹27",
      "itemSaved": "₹9.99",
      "itemImg": "https://www.bigbasket.com/media/uploads/p/l/40016096_2-fresho-lettuce-romaine.jpg?tr=w-256,q=80",
      "orderId": 1348947148
    },
    {
      "itemDesc": "Fresho Carrot - Red 500 g ",
      "itemQty": 1.29,
      "itemPrice": "₹24.99",
      "itemSaved": "₹9.25",
      "itemImg": "https://www.bigbasket.com/media/uploads/p/l/10000382_10-fresho-carrot-red.jpg?tr=w-256,q=80",
      "orderId": 1348947148
    },
    {
      "itemDesc": "Fresho Cabbage 1 pc  (approx. 500 g to 800 g)",
      "itemQty": 1,
      "itemPrice": "₹21",
      "itemSaved": "₹7.77",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1348947148
    },
    {
      "itemDesc": "Fresho Cucumber 500 g ",
      "itemQty": 1.19,
      "itemPrice": "₹26.78",
      "itemSaved": "₹25.39",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1348947148
    },
    {
      "itemDesc": "McCain Veggie Burger Patty 360 g Pouch",
      "itemQty": 1,
      "itemPrice": "₹135",
      "itemSaved": "0",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1348947148
    },
    {
      "itemDesc": "Godrej Yummiez Yummiez Crispy Veggie Burger Patty 400 g Pouch Pack",
      "itemQty": 1,
      "itemPrice": "₹159",
      "itemSaved": "0",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1348947148
    },
    {
      "itemDesc": "Fresho EGG- 10 Farm Fresh - No antibiotics,hormone, steroids - All Natural 10 pcs ",
      "itemQty": 1,
      "itemPrice": "₹92",
      "itemSaved": "₹108",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1348947148
    },
    {
      "itemDesc": "English Oven Burger Bun 300 g Pouch",
      "itemQty": 1,
      "itemPrice": "₹50",
      "itemSaved": "0",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1348947148
    },
    {
      "itemDesc": "Ching's Secret Manchow Instant Soup 15 g Pouch",
      "itemQty": 1,
      "itemPrice": "₹10",
      "itemSaved": "0",
      "itemImg": "https://www.bigbasket.com/media/uploads/p/l/40019452_5-chings-secret-manchow-instant-soup.jpg?tr=w-256,q=80",
      "orderId": 1350181430
    },
    {
      "itemDesc": "Fresho Farm Eggs - Table Tray, Medium, Antibiotic Residue-Free 30 pcs ",
      "itemQty": 1,
      "itemPrice": "₹265",
      "itemSaved": "₹225",
      "itemImg": "https://www.bigbasket.com/media/uploads/p/l/150502_6-fresho-farm-eggs-table-tray-medium-antibiotic-residue-free.jpg?tr=w-256,q=80",
      "orderId": 1350181430
    },
    {
      "itemDesc": "IndiSecrets Organic Tea - Tulsi &amp; Ginger 36 g  (20 Bags x 1.8 g each)",
      "itemQty": 1,
      "itemPrice": "₹139",
      "itemSaved": "₹60",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1350181430
    },
    {
      "itemDesc": "BB Royal Jaggery Kolhapuri - Bucket 900 g ",
      "itemQty": 1,
      "itemPrice": "₹93",
      "itemSaved": "₹19",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1350181430
    },
    {
      "itemDesc": "Lion Dates - Deseeded 500 g Cup",
      "itemQty": 1,
      "itemPrice": "₹156",
      "itemSaved": "0",
      "itemImg": "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "orderId": 1350181430
    }
];

const GroceryTable = () =>{

    const tableContent = InitialGrocery.map(item => {
        return (
            <tr>
                <td>{item.itemDesc}</td>
                <td>{item.itemQty}</td>
                <td>{item.itemPrice}</td>
                <td>{item.itemSaved}</td>
                <td>{item.itemImg}</td>
                <td>{item.orderId}</td>
            </tr>
        )
    })
    
    return (
        <>
        <Container className="table-responsive">
            <Table className="table">
                <thead>
                    <tr>
                        <th>Desc</th>
                        <th>QTy</th>
                        <th>Price</th>
                        <th>Saved</th>
                        <th>Img</th>
                        <th>orderId</th>
                    </tr>
                </thead>
                <tbody>
                    {tableContent}
                </tbody>
            </Table>
        </Container>
        </>
    );
}

export default GroceryTable;