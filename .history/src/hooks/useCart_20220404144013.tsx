import { createContext, ReactNode, useContext, useState } from 'react';
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
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart); // storagedCart retuna string, aq retorna como um json/ array
    }

    return [];

    //criando um avariavel que vai buscar os dados no localStorege
  });

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart] //para permanece a imutabilidade do cart 
      const productExits = updateCart.find(product => product.id === productId) //verificar se o produto existe

      const stock = await api.get(`/stock/${productId}`) //chamar a rota do estoque com o id do produto usando o templete $

      const stockAmount = stock.data.amount; // pegando o amount do produto
      const currentAmount = productExits ? productExits.amount : 0; // se existr no carrinho eu pego a quantidade dele, se não é 0
      
      const amount = currentAmount + 1; //quantidade desejada mais um

      if(amount > stockAmount) { //se a quantidade que desejo add é maior que a quantidade em estoque deve falhar 
        toast.error('Quantidade solicitada fora de estoque');
        return; //finalizar
      }

      if (productExits) {
        // se o produto existe no carrinho vamos atualizar o produto
        productExits.amount = amount // atualiza a quantidade de produtos
      } else {
        // se não existe vamos add no carrinho
        const product = await api.get(`/products/${productId}`)

        //vamos buscar na api o produto e add um amount de =+ 1 primeira vez que ta add
        const newProduct = {
          ...product.data, //pega os outros dados do product com "..."
          amount: 1 // add o amount aos dados
        }

        updateCart.push(newProduct) // mandar os dados para o updateCart

      }
      setCart(updateCart) //salvar as informações no updateCart
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart)) //salvar no localStorege
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // verificar se existe no carrinho
      const updateCart = [...cart];
      const productIndex = updateCart.findIndex(product => product.id === productId) // findIndex, retorna -1 se não encontrar

      if(productIndex >= 0) {//se encontrar
        updateCart.splice(productIndex, 1) //apagar um index

        setCart(updateCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart)) //salvar no localStorege
      } else {
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
      if(amount <= 0) {
        return; 
      }

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updateCart = [...cart]

      const productExists = updateCart.find(product => product.id === productId)

      if(productExists) {
        productExists.amount = amount
        setCart(updateCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart)) //salvar no localStorege

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
