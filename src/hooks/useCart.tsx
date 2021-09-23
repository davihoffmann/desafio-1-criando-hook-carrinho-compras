import { createContext, ReactNode, useContext, useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCarRef = useRef<Product[]>();

  useEffect(() => {
    prevCarRef.current = cart;
  });

  const cartPreviousValue = prevCarRef.current ?? cart;

  useEffect(() => {
    if(cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExistsInCart = updatedCart.find(item => item.id === productId);
      
      const stock = await api.get(`/stock/${productId}`);
      const quantityStock = stock.data.amount;
      const quantityCart = productExistsInCart ?  productExistsInCart.amount : 0;
      const quantity = quantityCart + 1;

      if (quantity > quantityStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExistsInCart) { 
        productExistsInCart.amount = quantity;
      } else {
        const response = await api.get(`/products/${productId}`);
        updatedCart.push({
          ...response.data,
          amount: 1
        });
      }

      setCart(updatedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productInCart = updatedCart.findIndex(item => item.id === productId);

      if(productInCart >= 0) {
        updatedCart.slice(productInCart, 1);
        setCart(updatedCart);
      } else {
        toast.error('Erro na remoção do produto');
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
      if(amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const quantityStock = stock.data.amount;

      if(amount > quantityStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExistsInCart = updatedCart.find(item => item.id === productId);

      if(productExistsInCart) {
        productExistsInCart.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

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
