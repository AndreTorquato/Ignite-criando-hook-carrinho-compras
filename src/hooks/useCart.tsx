import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}


const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });


  const prevCartRef = useRef<Product[]>();
  
  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));           
    }
  },[cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
        let currentCart = [...cart];
        
        const productInCart= currentCart.find(product => product.id === productId);
    
        if(productInCart){
          const productStock = stock.find(product => product.id === productId)?.amount || 0;
          if(productStock > productInCart.amount ){
            currentCart = await currentCart.map(product => {
              if(product.id === productId){
                  product.amount++;
              }
              return product;
             })
          }else{
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }
          
        }else{
          const getProduct: Product[] = products.filter(product => product.id === productId);
          let product: Product;
          if(getProduct){
            product = {
              ...getProduct[0],
              amount: 1,
            };
          }else {
            throw Error();
          }
          currentCart.push(product);
        }

        
        setCart(currentCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
    const productExists = cart.find(product => product.id === productId);
    if(productExists) {
      const newCart: Product[] = cart.filter(product => product.id !== productId);
      setCart([...newCart]);
    }else{
      throw Error();
    }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
        if(amount < 1){
          return;
        }
        const productStock = stock.find(product => product.id === productId)?.amount || 0;
        if(amount > productStock){
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        const currentCart = [...cart];
        
        const productExists = currentCart.find(product => product.id === productId);
        
        if(productExists){

        productExists.amount = amount;
        
        setCart(currentCart);
        }else{
          throw Error();
        }

        
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  useEffect(()=>{
    api.get('products')
    .then(response => setProducts([...response.data]))
    api.get('stock')
    .then(response => setStock([...response.data]));
  }, []);

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
